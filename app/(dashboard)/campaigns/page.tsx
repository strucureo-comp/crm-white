"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  Sparkles,
  Calendar,
  DollarSign
} from "lucide-react";
import { useAuth } from '@/lib/firebase/auth-context';
import { createCampaign, updateCampaign, deleteCampaign, subscribeToCampaigns, Campaign, SpendEntry } from '@/lib/db/campaigns/api';

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

export default function CampaignsPage() {
  const { workspace, user } = useAuth();
  const [internalCampaigns, setInternalCampaigns] = useState<Campaign[]>([]);
  const [externalCampaigns, setExternalCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    if (!workspace?.id) return;
    const unsubscribe = subscribeToCampaigns(workspace?.id, (data) => {
      setInternalCampaigns(data.filter(c => c.source === 'internal'));
      setExternalCampaigns(data.filter(c => c.source !== 'internal'));
    });
    return () => unsubscribe();
  }, [workspace?.id]);
  
  const metaConnected = externalCampaigns.some(c => c.source === 'meta');
  const googleConnected = externalCampaigns.some(c => c.source === 'google');
  
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChannel, setFilterChannel] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Toast State
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<Partial<Campaign>>({});
  
  // Spend Entry State
  const [newSpendAmount, setNewSpendAmount] = useState("");
  const [newSpendDate, setNewSpendDate] = useState(new Date().toISOString().split('T')[0]);

  const addToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleConnectMeta = async () => {
    if (!workspace?.id) return;
    try {
      await createCampaign(workspace?.id, {
        name: "Retargeting - Product A",
        source: "meta",
        status: "Active",
        budget: 3000,
        spent: 1200,
        impressions: 80000,
        clicks: 3200,
        lastSynced: new Date().toISOString(),
        currency: "USD",
      });
      addToast("Meta Ads connected successfully!");
    } catch {
      addToast("Failed to connect Meta Ads", "error");
    }
  };

  const handleConnectGoogle = async () => {
    if (!workspace?.id) return;
    try {
      await createCampaign(workspace?.id, {
        name: "Search - Brand Keywords",
        source: "google",
        status: "Active",
        budget: 8000,
        spent: 4500,
        impressions: 250000,
        clicks: 12500,
        lastSynced: new Date().toISOString(),
        currency: "USD",
      });
      addToast("Google Ads connected successfully!");
    } catch {
      addToast("Failed to connect Google Ads", "error");
    }
  };

  const handleSyncData = async () => {
    if (!workspace?.id) return;
    if (!metaConnected && !googleConnected) {
      addToast("Connect an external provider to sync data.", "error");
      return;
    }
    setSyncing(true);
    
    try {
      const updates = externalCampaigns.map(c => {
        return updateCampaign(workspace?.id!, c.id!, {
          spent: c.spent + Math.floor(Math.random() * 100),
          clicks: c.clicks + Math.floor(Math.random() * 50),
          impressions: c.impressions + Math.floor(Math.random() * 1000),
          lastSynced: new Date().toISOString(),
        });
      });
      await Promise.all(updates);
      addToast("Data synced successfully!");
    } catch (e) {
      addToast("Failed to sync data", "error");
    } finally {
      setSyncing(false);
    }
  };

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

  const openEditModal = (campaign: Campaign) => {
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

  const allCampaigns = useMemo(() => [...internalCampaigns, ...externalCampaigns], [internalCampaigns, externalCampaigns]);

  const filteredCampaigns = useMemo(() => {
    return allCampaigns.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.id || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChannel = filterChannel === "All" || c.source.toLowerCase() === filterChannel.toLowerCase();
      const matchesStatus = filterStatus === "All" || c.status.toLowerCase() === filterStatus.toLowerCase();
      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [allCampaigns, searchQuery, filterChannel, filterStatus]);

  const totalPortfolioSpend = allCampaigns.reduce((sum, c) => sum + c.spent, 0);
  const activeBudget = allCampaigns.filter((c) => c.status === "Active").reduce((sum, c) => sum + c.budget, 0);

  const formatCurrency = (amount: number, currency: string = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  return (
    <div className="space-y-6">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-top-2 fade-in duration-300 ${
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
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
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
              <span className="text-xl font-bold text-foreground">{formatCurrency(totalPortfolioSpend)}</span>
            </div>
            <div className="h-10 w-px bg-muted"></div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Budget</span>
              <span className="text-xl font-bold text-emerald-500">{formatCurrency(activeBudget)}</span>
            </div>
          </div>
        </div>

        {/* Connections Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Meta Card */}
          <div className="bg-card p-5 rounded-xl shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <MetaIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Meta Ads</h3>
                <p className="text-xs text-muted-foreground font-medium">
                  {metaConnected ? "Connected and syncing" : "Connect your Meta account"}
                </p>
              </div>
            </div>
            {metaConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-4 h-4" /> Connected
              </div>
            ) : (
              <button 
                onClick={handleConnectMeta}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                <Lock className="w-4 h-4" /> Connect
              </button>
            )}
          </div>

          {/* Google Card */}
          <div className="bg-card p-5 rounded-xl shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center border border-border">
                <GoogleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Google Ads</h3>
                <p className="text-xs text-muted-foreground font-medium">
                  {googleConnected ? "Connected and syncing" : "Connect your Google account"}
                </p>
              </div>
            </div>
            {googleConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-4 h-4" /> Connected
              </div>
            ) : (
              <button 
                onClick={handleConnectGoogle}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                <Lock className="w-4 h-4" /> Connect
              </button>
            )}
          </div>
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
                <option value="All">All Channels</option>
                <option value="Internal">Internal</option>
                <option value="Meta">Meta</option>
                <option value="Google">Google</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleSyncData}
              disabled={syncing || (!metaConnected && !googleConnected)}
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
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">No campaigns found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((campaign) => {
                    const progress = Math.min(100, campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0);
                    const progressColor = progress > 90 ? 'bg-red-500' : progress > 75 ? 'bg-amber-500' : 'bg-emerald-500';
                    
                    return (
                      <tr key={campaign.id} className="hover:bg-muted/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{campaign.name}</span>
                            <span className="text-xs text-muted-foreground font-medium mt-0.5">{campaign.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {campaign.source === 'meta' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60"><MetaIcon className="w-3.5 h-3.5"/> Meta Ads</span>}
                            {campaign.source === 'google' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-foreground border border-border"><GoogleIcon className="w-3.5 h-3.5"/> Google Ads</span>}
                            {campaign.source === 'internal' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20"><Layers className="w-3.5 h-3.5"/> Internal</span>}
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
                          <div className="flex flex-col gap-1.5 w-48">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-foreground">{formatCurrency(campaign.spent, campaign.currency || 'USD')}</span>
                              <span className="text-muted-foreground">{formatCurrency(campaign.budget, campaign.currency || 'USD')}</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${progressColor} transition-all duration-1000 ease-out rounded-full`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4 text-sm font-medium">
                            <div className="flex flex-col">
                              <span className="text-foreground">{formatNumber(campaign.impressions)}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Impr</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-foreground">{formatNumber(campaign.clicks)}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Clicks</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {campaign.source === 'internal' ? (
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => openEditModal(campaign)}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteCampaign(campaign.id!)}
                                className="p-1.5 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium">Read-only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
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
                      {formatCurrency(formData.spent || 0, formData.currency || "USD")}
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
                                  {formatCurrency(entry.amount, formData.currency || "USD")}
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
