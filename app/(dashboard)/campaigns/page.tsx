"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Edit2,
  Trash2,
  X,
  Layers,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Unplug,
  Building2,
} from "lucide-react";
import { useAuth } from '@/lib/firebase/auth-context';
import { useWorkspace } from '@/lib/settings/workspace-context';
import { formatCurrency } from '@/lib/utils';
import { createCampaign, updateCampaign, deleteCampaign, subscribeToCampaigns, Campaign } from '@/lib/db/campaigns/api';
import {
  AdsApiError,
  disconnectAdPlatform,
  fetchAdAccounts,
  fetchCampaignFeed,
  selectAdAccount,
  startAdOAuth,
  triggerAdSync,
  type AdAccountRef,
  type AdPlatform,
  type CampaignFeedResponse,
  type PublicAdConnection,
  type UnifiedCampaignRow,
} from '@/lib/ads/client';

const MetaIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

const GoogleIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const PAGE_SIZE = 25;

const PLATFORM_LABEL: Record<AdPlatform, string> = { meta: "Meta Ads", google: "Google Ads" };

/** The channel select keeps its existing labels; the API speaks in sources. */
const CHANNEL_TO_SOURCE: Record<string, 'all' | 'crm' | 'meta' | 'google'> = {
  All: 'all',
  Internal: 'crm',
  Meta: 'meta',
  Google: 'google',
};

const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

/** Renders a metric that a platform may simply not report. */
const metric = (value?: number) => (value === undefined || value === null ? "—" : formatNumber(value));

function relativeTime(iso?: string | null): string {
  if (!iso) return "Never";
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "Never";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(then).toLocaleDateString();
}

function shortDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CampaignsPage() {
  const { workspace } = useAuth();
  const { currency } = useWorkspace();

  // CRM campaigns stay on the realtime subscription: it powers the create/edit
  // modal and doubles as a fallback if the unified feed is unavailable.
  const [internalCampaigns, setInternalCampaigns] = useState<Campaign[]>([]);

  const [feed, setFeed] = useState<CampaignFeedResponse | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(true);
  /** Integration failures render as a banner instead of breaking the page. */
  const [feedError, setFeedError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [busyPlatform, setBusyPlatform] = useState<AdPlatform | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [page, setPage] = useState(1);

  const [accountPicker, setAccountPicker] = useState<{
    connection: PublicAdConnection;
    accounts: AdAccountRef[];
    loading: boolean;
    saving: string | null;
  } | null>(null);

  // Toast State
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<Partial<Campaign>>({});

  // Spend Entry State
  const [newSpendAmount, setNewSpendAmount] = useState("");
  const [newSpendDate, setNewSpendDate] = useState(new Date().toISOString().split('T')[0]);

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------
  const loadFeed = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!workspace?.id) return;
      if (!options.silent) setLoadingFeed(true);
      try {
        const data = await fetchCampaignFeed({
          workspaceId: workspace.id,
          search: debouncedSearch,
          source: CHANNEL_TO_SOURCE[filterChannel] ?? 'all',
          status: filterStatus === "All" ? 'all' : filterStatus,
          page,
          pageSize: PAGE_SIZE,
        });
        setFeed(data);
        setFeedError(null);
      } catch (error) {
        setFeedError(
          error instanceof Error ? error.message : "Could not load campaigns from the server.",
        );
      } finally {
        setLoadingFeed(false);
      }
    },
    [workspace?.id, debouncedSearch, filterChannel, filterStatus, page],
  );

  const loadFeedRef = useRef(loadFeed);
  useEffect(() => {
    loadFeedRef.current = loadFeed;
  }, [loadFeed]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  // Debounce search so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [filterChannel, filterStatus]);

  // The realtime subscription keeps the modal's source data current and quietly
  // refreshes the feed whenever a CRM campaign changes.
  useEffect(() => {
    if (!workspace?.id) return;
    let isFirstSnapshot = true;
    const unsubscribe = subscribeToCampaigns(workspace.id, (data) => {
      setInternalCampaigns(data.filter((c) => !c.source || c.source === 'internal'));
      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        return;
      }
      void loadFeedRef.current({ silent: true });
    });
    return () => unsubscribe();
  }, [workspace?.id]);

  const connections = feed?.connections ?? [];
  const metaConnection = connections.find((c) => c.platform === 'meta') ?? null;
  const googleConnection = connections.find((c) => c.platform === 'google') ?? null;
  const canManage = ['owner', 'admin', 'manager'].includes((feed?.role || '').toLowerCase());

  // -------------------------------------------------------------------------
  // Connection actions
  // -------------------------------------------------------------------------
  const handleConnect = async (platform: AdPlatform) => {
    if (!workspace?.id) return;
    setBusyPlatform(platform);
    try {
      // The consent URL is built server-side so the app credentials and the
      // signed state never exist in the browser bundle.
      const url = await startAdOAuth(workspace.id, platform);
      window.location.href = url;
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : `Could not start the ${PLATFORM_LABEL[platform]} connection.`,
        "error",
      );
      setBusyPlatform(null);
    }
  };

  const openAccountPicker = useCallback(
    async (connection: PublicAdConnection) => {
      if (!workspace?.id) return;
      setAccountPicker({ connection, accounts: connection.available_accounts, loading: true, saving: null });
      try {
        const { accounts, warning } = await fetchAdAccounts(workspace.id, connection.id);
        if (warning) addToast(warning, "error");
        setAccountPicker({ connection, accounts, loading: false, saving: null });
      } catch (error) {
        setAccountPicker((prev) => (prev ? { ...prev, loading: false } : prev));
        addToast(error instanceof Error ? error.message : "Could not load ad accounts.", "error");
      }
    },
    [workspace?.id, addToast],
  );

  const handleSelectAccount = async (accountId: string) => {
    if (!workspace?.id || !accountPicker) return;
    setAccountPicker({ ...accountPicker, saving: accountId });
    try {
      const result = await selectAdAccount(workspace.id, accountPicker.connection.id, accountId);
      setAccountPicker(null);
      if (result.sync?.error) addToast(result.sync.error, "error");
      else addToast(`Imported ${result.sync?.campaignCount ?? 0} campaigns from ${result.selected_account.name}.`);
      await loadFeed({ silent: true });
    } catch (error) {
      setAccountPicker((prev) => (prev ? { ...prev, saving: null } : prev));
      addToast(error instanceof Error ? error.message : "Could not select that ad account.", "error");
    }
  };

  const handleDisconnect = async (connection: PublicAdConnection) => {
    if (!workspace?.id) return;
    const label = PLATFORM_LABEL[connection.platform];
    if (!confirm(`Disconnect ${label}? Imported campaigns will be removed from the CRM. Nothing is changed inside ${label}.`)) {
      return;
    }
    setBusyPlatform(connection.platform);
    try {
      await disconnectAdPlatform(workspace.id, connection.id);
      addToast(`${label} disconnected.`);
      await loadFeed({ silent: true });
    } catch (error) {
      addToast(error instanceof Error ? error.message : `Could not disconnect ${label}.`, "error");
    } finally {
      setBusyPlatform(null);
    }
  };

  const runSync = useCallback(
    async (connectionId?: string) => {
      if (!workspace?.id) return;
      setSyncing(true);
      try {
        const { outcomes } = await triggerAdSync(workspace.id, connectionId);
        const failures = outcomes.filter((o) => o.error);
        const imported = outcomes.reduce((sum, o) => sum + (o.skipped ? 0 : o.campaignCount), 0);
        if (failures.length > 0) addToast(failures[0].error as string, "error");
        else if (outcomes.length === 0) addToast("Nothing to sync yet.", "error");
        else addToast(`Synced ${imported} campaigns.`);
        await loadFeed({ silent: true });
      } catch (error) {
        const message =
          error instanceof AdsApiError && error.status === 429
            ? error.message
            : error instanceof Error
              ? error.message
              : "Sync failed.";
        addToast(message, "error");
      } finally {
        setSyncing(false);
      }
    },
    [workspace?.id, addToast, loadFeed],
  );

  // -------------------------------------------------------------------------
  // OAuth return handling — the callback route redirects here with a result.
  // -------------------------------------------------------------------------
  const [pendingCallback, setPendingCallback] = useState<{ select?: string; sync?: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const failure = params.get('ads_error');
    const connected = params.get('ads_connected');
    const select = params.get('ads_select');
    const sync = params.get('ads_sync');
    if (!failure && !connected && !select && !sync) return;

    if (failure) addToast(failure, "error");
    else if (connected) addToast(`${PLATFORM_LABEL[connected as AdPlatform] || connected} connected.`);
    if (select || sync) setPendingCallback({ select: select ?? undefined, sync: sync ?? undefined });

    // Strip the parameters so a refresh does not replay the toast or the sync.
    window.history.replaceState({}, '', window.location.pathname);
  }, [addToast]);

  useEffect(() => {
    if (!pendingCallback || !feed) return;
    const { select, sync } = pendingCallback;
    setPendingCallback(null);
    if (select) {
      const connection = feed.connections.find((c) => c.id === select);
      if (connection) void openAccountPicker(connection);
    } else if (sync) {
      void runSync(sync);
    }
  }, [pendingCallback, feed, openAccountPicker, runSync]);

  // -------------------------------------------------------------------------
  // CRM campaign CRUD (unchanged — only internal campaigns are editable)
  // -------------------------------------------------------------------------
  const handleSaveCampaign = async () => {
    if (!workspace?.id || !formData.name || !formData.budget) return;

    try {
      if (editingCampaign && editingCampaign.id) {
        await updateCampaign(workspace?.id, editingCampaign.id, formData);
        addToast("Campaign updated!");
      } else {
        const newCampaign = {
          name: formData.name || "",
          source: "internal",
          status: formData.status || "Draft",
          budget: Number(formData.budget) || 0,
          spent: Number(formData.spent) || 0,
          impressions: 0,
          clicks: 0,
          lastSynced: new Date().toISOString(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          currency: formData.currency || "USD",
          spendHistory: formData.spendHistory || [],
          ...formData
        };
        await createCampaign(workspace?.id, newCampaign);
        addToast("Campaign created!");
      }
      setIsModalOpen(false);
      setEditingCampaign(null);
      setFormData({});
    } catch (e) {
      addToast("Failed to save campaign", "error");
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!workspace?.id) return;
    if (confirm("Are you sure you want to delete this campaign?")) {
      try {
        await deleteCampaign(workspace?.id, id);
        addToast("Campaign deleted!");
      } catch (e) {
        addToast("Failed to delete campaign", "error");
      }
    }
  };

  /** Imported rows have no editable record; only CRM rows open the modal. */
  const openEditModal = (row: UnifiedCampaignRow) => {
    const campaign = internalCampaigns.find((c) => c.id === row.id);
    if (!campaign) {
      addToast("This campaign is read-only.", "error");
      return;
    }
    setEditingCampaign(campaign);
    setFormData(campaign);
    setNewSpendAmount("");
    setNewSpendDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingCampaign(null);
    setFormData({ status: "Draft", currency: "USD", spent: 0, spendHistory: [] });
    setNewSpendAmount("");
    setNewSpendDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleAddSpendEntry = () => {
    if (!newSpendAmount || isNaN(Number(newSpendAmount)) || Number(newSpendAmount) <= 0) {
      addToast("Please enter a valid amount", "error");
      return;
    }
    const amount = Number(newSpendAmount);
    const entry = {
      id: `SPEND-${Date.now()}`,
      date: newSpendDate,
      amount: amount
    };
    const currentHistory = formData.spendHistory || [];
    const currentSpent = formData.spent || 0;

    setFormData({
      ...formData,
      spendHistory: [entry, ...currentHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      spent: currentSpent + amount
    });
    setNewSpendAmount("");
    addToast("Spend entry added successfully");
  };

  const handleRemoveSpendEntry = (id: string, amount: number) => {
    const currentHistory = formData.spendHistory || [];
    const currentSpent = formData.spent || 0;
    setFormData({
      ...formData,
      spendHistory: currentHistory.filter(e => e.id !== id),
      spent: Math.max(0, currentSpent - amount)
    });
    addToast("Spend entry removed");
  };

  // -------------------------------------------------------------------------
  // Derived view data
  // -------------------------------------------------------------------------
  /** Client-side view of CRM campaigns, used only if the feed request fails. */
  const fallbackRows = useMemo<UnifiedCampaignRow[]>(() => {
    const needle = debouncedSearch.toLowerCase();
    return internalCampaigns
      .filter((c) => {
        const matchesSearch =
          !needle || c.name.toLowerCase().includes(needle) || (c.id || "").toLowerCase().includes(needle);
        const matchesChannel = filterChannel === "All" || filterChannel === "Internal";
        const matchesStatus = filterStatus === "All" || (c.status || "").toLowerCase() === filterStatus.toLowerCase();
        return matchesSearch && matchesChannel && matchesStatus;
      })
      .map((c) => ({
        id: c.id || "",
        source: 'crm' as const,
        read_only: false,
        name: c.name,
        status: c.status || "Unknown",
        currency: c.currency,
        budget: c.budget,
        spend: c.spent,
        impressions: c.impressions,
        clicks: c.clicks,
        start_date: c.startDate ?? null,
        end_date: c.endDate ?? null,
        last_synced_at: c.lastSynced ?? null,
      }));
  }, [internalCampaigns, debouncedSearch, filterChannel, filterStatus]);

  const usingFallback = feedError !== null;
  const rows = usingFallback ? fallbackRows : feed?.rows ?? [];
  const totalCount = usingFallback ? fallbackRows.length : feed?.total ?? 0;
  const pageCount = usingFallback ? 1 : feed?.pageCount ?? 1;
  const currentPage = usingFallback ? 1 : feed?.page ?? 1;

  const totalPortfolioSpend = usingFallback
    ? fallbackRows.reduce((sum, r) => sum + (r.spend ?? 0), 0)
    : feed?.totals.spend ?? 0;
  const activeBudget = usingFallback
    ? fallbackRows.reduce((sum, r) => sum + (r.status === "Active" ? r.budget ?? 0 : 0), 0)
    : feed?.totals.activeBudget ?? 0;

  const statusOptions = useMemo(() => {
    const base = ["Active", "Paused", "Draft"];
    return Array.from(new Set([...base, ...(feed?.statuses ?? [])]));
  }, [feed?.statuses]);

  const hasSyncableConnection = connections.some((c) => c.selected_account);
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(totalCount, currentPage * PAGE_SIZE);

  // -------------------------------------------------------------------------
  // Connection card — same shell as before, real state inside
  // -------------------------------------------------------------------------
  const renderConnectionCard = (platform: AdPlatform, connection: PublicAdConnection | null) => {
    const configured = feed?.providers?.[platform]?.configured ?? true;
    const label = PLATFORM_LABEL[platform];
    const busy = busyPlatform === platform;
    const needsReauth = connection?.status === 'needs_reauth';
    const needsAccount = Boolean(connection) && !needsReauth && !connection?.selected_account;
    const isLive = Boolean(connection?.selected_account) && !needsReauth;

    const subtitle = !configured
      ? `${label} is not configured on this server yet`
      : !connection
        ? `Connect your ${platform === 'meta' ? 'Meta' : 'Google'} account`
        : needsReauth
          ? 'Access expired — reconnect to resume syncing'
          : needsAccount
            ? 'Authorized — choose an ad account to sync'
            : `${connection?.selected_account?.name ?? 'Account'} · Synced ${relativeTime(connection?.last_synced_at)}`;

    return (
      <div className="bg-card p-5 rounded-xl shadow-sm border border-border flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4 min-w-0">
          {platform === 'meta' ? (
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
              <MetaIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center border border-border shrink-0">
              <GoogleIcon className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{label}</h3>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                <Lock className="w-2.5 h-2.5" /> Read only
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium truncate">{subtitle}</p>
            {connection?.last_error && !needsReauth && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5 truncate">
                {connection.last_error}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {isLive && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-4 h-4" /> Connected
            </div>
          )}
          {needsAccount && (
            <button
              onClick={() => connection && openAccountPicker(connection)}
              disabled={!canManage || busy}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Building2 className="w-4 h-4" /> Choose account
            </button>
          )}
          {(!connection || needsReauth) && (
            <button
              onClick={() => handleConnect(platform)}
              disabled={!configured || !canManage || busy}
              title={!configured ? `${label} is not configured on this server` : undefined}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" /> {needsReauth ? 'Reconnect' : 'Connect'}
            </button>
          )}
          {connection && canManage && (
            <div className="flex items-center gap-3 text-xs font-semibold">
              {connection.available_accounts.length > 1 && (
                <button
                  onClick={() => openAccountPicker(connection)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Change account
                </button>
              )}
              <button
                onClick={() => handleDisconnect(connection)}
                disabled={busy}
                className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <Unplug className="w-3 h-3" /> Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-top-2 fade-in duration-300 max-w-sm ${
              toast.type === "success"
              ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400"
              : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400"
            }`}
          >
            {toast.type === "success" ? (
              <div className="animate-bounce">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl shadow-sm border border-border transition-colors">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Ad-Suite Campaigns</h1>
              <span className="px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Enterprise
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Manage and monitor all your advertising campaigns in one place.</p>
          </div>

          <div className="flex gap-6 items-center">
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Portfolio Spend</span>
              <span className="text-xl font-bold text-foreground">{formatCurrency(totalPortfolioSpend, currency)}</span>
            </div>
            <div className="h-10 w-px bg-muted"></div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Budget</span>
              <span className="text-xl font-bold text-emerald-500">{formatCurrency(activeBudget, currency)}</span>
            </div>
          </div>
        </div>

        {/* Integration banner — a failing integration never hides CRM campaigns */}
        {feedError && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-xl">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-sm font-medium">
              {feedError}
              <button
                onClick={() => void loadFeed()}
                className="ml-2 underline underline-offset-2 hover:no-underline"
              >
                Retry
              </button>
              <p className="text-xs font-normal mt-0.5 opacity-80">
                Showing your CRM campaigns only. Imported campaigns are unavailable right now.
              </p>
            </div>
          </div>
        )}

        {/* Connections Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderConnectionCard('meta', metaConnection)}
          {renderConnectionCard('google', googleConnection)}
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border transition-colors">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all placeholder:text-muted-foreground text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="All">All Channels{feed ? ` (${feed.counts.all})` : ''}</option>
                <option value="Internal">Internal{feed ? ` (${feed.counts.crm})` : ''}</option>
                <option value="Meta">Meta{feed ? ` (${feed.counts.meta})` : ''}</option>
                <option value="Google">Google{feed ? ` (${feed.counts.google})` : ''}</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="All">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {feed?.lastSyncedAt && (
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Last synced {relativeTime(feed.lastSyncedAt)}
              </span>
            )}
            <button
              onClick={() => void runSync()}
              disabled={syncing || !hasSyncableConnection || !canManage}
              title={!hasSyncableConnection ? 'Connect an ad account to sync' : undefined}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-primary/20"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              Sync Data
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create Campaign
            </button>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaign</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spend vs Budget</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Synced</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingFeed && rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-3 animate-spin" />
                      <p className="text-muted-foreground font-medium">Loading campaigns…</p>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">No campaigns found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  rows.map((campaign) => {
                    const rowCurrency = campaign.currency || currency;
                    const budget = campaign.budget ?? 0;
                    const spend = campaign.spend ?? 0;
                    const progress = Math.min(100, budget > 0 ? (spend / budget) * 100 : 0);
                    const progressColor = progress > 90 ? 'bg-red-500' : progress > 75 ? 'bg-amber-500' : 'bg-emerald-500';
                    const start = shortDate(campaign.start_date);
                    const end = shortDate(campaign.end_date);

                    return (
                      <tr key={`${campaign.source}-${campaign.id}`} className="hover:bg-muted/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{campaign.name}</span>
                            <span className="text-xs text-muted-foreground font-medium mt-0.5">
                              {campaign.external_id || campaign.id}
                            </span>
                            {(start || end || campaign.account_name) && (
                              <span className="text-[11px] text-muted-foreground/80 font-medium mt-0.5">
                                {campaign.account_name ? `${campaign.account_name}` : ''}
                                {campaign.account_name && (start || end) ? ' · ' : ''}
                                {start || end ? `${start || '—'} → ${end || 'Ongoing'}` : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {campaign.source === 'meta' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60"><MetaIcon className="w-3.5 h-3.5"/> Meta Ads</span>}
                            {campaign.source === 'google' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-foreground border border-border"><GoogleIcon className="w-3.5 h-3.5"/> Google Ads</span>}
                            {campaign.source === 'crm' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20"><Layers className="w-3.5 h-3.5"/> Internal</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            campaign.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            campaign.status === 'Paused' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-muted text-foreground border-border'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              campaign.status === 'Active' ? 'bg-emerald-500' :
                              campaign.status === 'Paused' ? 'bg-amber-500' :
                              'bg-slate-400 dark:bg-slate-500'
                            }`} />
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-40">
                            <div className="flex items-baseline justify-between mb-1.5">
                              <span className="text-sm font-semibold text-foreground">
                                {campaign.spend === undefined ? '—' : formatCurrency(spend, rowCurrency)}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">
                                {campaign.budget === undefined ? 'No budget' : formatCurrency(budget, rowCurrency)}
                              </span>
                            </div>
                            {campaign.budget !== undefined && budget > 0 ? (
                              <>
                                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div className={`h-1.5 rounded-full ${progressColor}`} style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-[11px] text-muted-foreground font-medium mt-1 inline-block">
                                  {progress.toFixed(0)}% used
                                  {campaign.budget_period ? ` · ${campaign.budget_period}` : ''}
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {campaign.budget_period ? campaign.budget_period : 'Not reported'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5 text-xs font-medium">
                            <span className="text-foreground">{metric(campaign.impressions)} impressions</span>
                            <span className="text-muted-foreground">{metric(campaign.clicks)} clicks</span>
                            <span className="text-muted-foreground">{metric(campaign.conversions)} results</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted-foreground font-medium">
                            {relativeTime(campaign.last_synced_at)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {campaign.read_only ? (
                            // Imported campaigns expose no modification actions at all:
                            // the integration never writes back to Meta or Google.
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground border border-border"
                              title={`Managed in ${PLATFORM_LABEL[campaign.source as AdPlatform] ?? 'the ad platform'}. The CRM never changes it.`}
                            >
                              <Lock className="w-3 h-3" /> Read Only
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(campaign)}
                                className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                title="Edit campaign"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => campaign.id && handleDeleteCampaign(campaign.id)}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                                title="Delete campaign"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Server-side pagination: the browser only ever holds one page. */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border">
              <span className="text-xs text-muted-foreground font-medium">
                Showing {rangeStart}–{rangeEnd} of {totalCount} campaign{totalCount === 1 ? '' : 's'}
                {usingFallback && ' (CRM only)'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || loadingFeed}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <span className="text-xs text-muted-foreground font-medium px-1">
                  Page {currentPage} of {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage >= pageCount || loadingFeed}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ad account picker — shown when a provider exposes more than one account */}
      {accountPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md border border-border overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Choose a {PLATFORM_LABEL[accountPicker.connection.platform]} account
                </h2>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Campaigns are imported from the account you pick. Read-only.
                </p>
              </div>
              <button
                onClick={() => setAccountPicker(null)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {accountPicker.loading && accountPicker.accounts.length === 0 ? (
                <div className="py-10 text-center">
                  <RefreshCw className="w-6 h-6 text-muted-foreground mx-auto mb-2 animate-spin" />
                  <p className="text-sm text-muted-foreground font-medium">Loading accounts…</p>
                </div>
              ) : accountPicker.accounts.length === 0 ? (
                <div className="py-10 text-center">
                  <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">
                    No ad accounts are available for this login.
                  </p>
                </div>
              ) : (
                accountPicker.accounts.map((account) => {
                  const isSelected = accountPicker.connection.selected_account?.id === account.id;
                  const isSaving = accountPicker.saving === account.id;
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleSelectAccount(account.id)}
                      disabled={Boolean(accountPicker.saving)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                        isSelected ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted'
                      }`}
                    >
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate">{account.name}</span>
                        <span className="text-xs text-muted-foreground font-medium truncate">
                          {account.id}
                          {account.currency ? ` · ${account.currency}` : ''}
                          {account.inactive ? ' · Inactive' : ''}
                        </span>
                      </span>
                      {isSaving ? (
                        <RefreshCw className="w-4 h-4 text-primary animate-spin shrink-0" />
                      ) : isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      {/* Create / edit modal — CRM campaigns only, unchanged from before */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg border border-border overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {editingCampaign ? "Edit Campaign" : "Create New Campaign"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                  placeholder="e.g., Q4 Winter Sale"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Currency</label>
                  <select
                    value={formData.currency || "USD"}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Status</label>
                  <select
                    value={formData.status || "Draft"}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
                  >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate || ""}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate || ""}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
                  />
                </div>
              </div>

              {/* Budget and Spend Tracking Section */}
              <div className="border border-border rounded-xl overflow-hidden bg-muted/30">
                <div className="p-4 border-b border-border bg-background flex justify-between items-center">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Total Budget *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.budget || ""}
                      onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                      className="w-40 px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                      placeholder="5000"
                    />
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Total Spent</span>
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(formData.spent || 0, formData.currency || currency)}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> Track Spending
                  </h4>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="date"
                        value={newSpendDate}
                        onChange={(e) => setNewSpendDate(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        value={newSpendAmount}
                        onChange={(e) => setNewSpendAmount(e.target.value)}
                        placeholder="Amount"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <button
                      onClick={handleAddSpendEntry}
                      disabled={!newSpendAmount || Number(newSpendAmount) <= 0}
                      className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap"
                    >
                      Add Entry
                    </button>
                  </div>
                  {formData.spendHistory && formData.spendHistory.length > 0 ? (
                    <div className="mt-4 border border-border rounded-lg overflow-hidden">
                      <div className="max-h-40 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-background sticky top-0">
                            <tr>
                              <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
                              <th className="px-3 py-2 font-medium text-muted-foreground text-right">Amount</th>
                              <th className="px-3 py-2 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-background">
                            {formData.spendHistory.map((entry) => (
                              <tr key={entry.id} className="hover:bg-muted/50">
                                <td className="px-3 py-2 text-foreground">
                                  {new Date(entry.date).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2 text-foreground font-medium text-right">
                                  {formatCurrency(entry.amount, formData.currency || currency)}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    onClick={() => handleRemoveSpendEntry(entry.id, entry.amount)}
                                    className="p-1 text-muted-foreground hover:text-red-500 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-border rounded-lg bg-background">
                      <p className="text-sm text-muted-foreground">No spend entries yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border bg-muted/50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground bg-background border border-border rounded-xl hover:bg-muted transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCampaign}
                disabled={!formData.name || !formData.budget}
                className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingCampaign ? "Save Changes" : "Create Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
