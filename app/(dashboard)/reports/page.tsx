'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar, Clock, FileText, Plus, MoreHorizontal, RefreshCw, LineChart, Loader2, Pencil, Trash2, Eye } from 'lucide-react';
import { ReportDialog } from '@/components/dialogs/report-dialog';
import { getReports, deleteReport } from '@/lib/firebase/database';
import type { Report } from '@/lib/db/types';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { generateReportPdf, downloadPdf, openPdfPreview } from '@/lib/pdf-engine/generator';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getReports();
    setReports(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setConfirmState({ open: true, id });
  }

  async function onDeleteConfirm() {
    if (!confirmState.id) return;
    try {
      await deleteReport(confirmState.id);
      toast.success('Report deleted');
      load();
      setConfirmState({ open: false });
    } catch {
      toast.error('Failed to delete report');
      setConfirmState({ open: false });
    }
  }

  const dailyCount = reports.filter((r) => r.type === 'Daily').length;
  const weeklyCount = reports.filter((r) => r.type === 'Weekly').length;
  const monthlyCount = reports.filter((r) => r.type === 'Monthly').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-sm text-muted-foreground">Create and schedule business reports</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => toast.message('Scheduled report generation coming soon — reports can be run individually once configured')}>
            <RefreshCw size={14} className="mr-1.5" />
            Run All
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} size="sm" className="text-xs sm:text-sm">
            <Plus size={14} className="mr-1.5" />
            New Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Daily Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dailyCount}</p>
            <p className="text-xs text-muted-foreground">active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Weekly Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{weeklyCount}</p>
            <p className="text-xs text-muted-foreground">active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Monthly Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthlyCount}</p>
            <p className="text-xs text-muted-foreground">active</p>
          </CardContent>
        </Card>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <LineChart size={48} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No scheduled reports yet</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scheduled Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{report.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock size={12} />{report.nextRun}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} />{report.type}</span>
                        <span>{report.format}</span>
                        <span>{report.recipientCount} recipients</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className={
                      report.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }>{report.status}</Badge>
                    <Button variant="ghost" size="sm" className="h-8" onClick={async () => {
                      try {
                        const pdf = await generateReportPdf(report);
                        await downloadPdf(pdf, `Report-${report.name.replace(/\s+/g, '_')}.pdf`);
                        toast.success('Report downloaded');
                      } catch { toast.error('Failed to generate PDF'); }
                    }}><Download size={14} className="mr-1" />Download</Button>
                    <Button variant="ghost" size="sm" className="h-8" onClick={async () => {
                      try {
                        const pdf = await generateReportPdf(report);
                        const url = await openPdfPreview(pdf);
                        window.open(url, '_blank');
                      } catch { toast.error('Failed to generate preview'); }
                    }}><Eye size={14} className="mr-1" />Preview</Button>
                    <div className="relative">
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Report actions" onClick={() => setMenuOpen(menuOpen === report.id ? null : report.id)}>
                        <MoreHorizontal size={14} />
                      </Button>
                      {menuOpen === report.id && (
                        <div className="absolute right-0 top-8 z-10 w-28 rounded-md border bg-background shadow-lg">
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted" onClick={() => { setEditing(report); setMenuOpen(null); setDialogOpen(true); }}>
                            <Pencil size={14} /> Edit
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-red-600" onClick={() => { handleDelete(report.id); setMenuOpen(null); }}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ReportDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={load} report={editing} />
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState({ open })}
        title="Delete Report"
        description="Are you sure you want to delete this report? This action cannot be undone."
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
