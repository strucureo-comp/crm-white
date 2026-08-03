import { NextResponse } from 'next/server';
import { getAdminDatabase } from '@/lib/firebase/admin';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDatabase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Iterate all workspaces
    const workspacesSnap = await db.ref('workspaces').once('value');
    const workspaces = workspacesSnap.val() || {};
    const billingResults: any[] = [];

    for (const [wsId, wsData] of Object.entries(workspaces)) {
      // Get projects with billing data
      const projectsSnap = await db.ref(`workspaces/${wsId}/projects`).once('value');
      const projects = projectsSnap.val() || {};

      for (const [projectId, project] of Object.entries(projects) as [string, any][]) {
        if (!project.maintenance_cost || !project.next_billing_date) continue;

        const billingDate = new Date(project.next_billing_date);
        billingDate.setHours(0, 0, 0, 0);

        if (today < billingDate) continue;

        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${(project.name || project.title || '').slice(0, 3).toUpperCase()}`;
        const dueDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const invoiceId = await db.ref(`workspaces/${wsId}/invoices`).push().key;
        if (!invoiceId) {
          billingResults.push({ workspace: wsId, project: project.name || project.title, status: 'failed', error: 'Failed to generate invoice ID' });
          continue;
        }

        await db.ref(`workspaces/${wsId}/invoices/${invoiceId}`).set({
          id: invoiceId,
          project_id: projectId,
          client_id: project.client_id || '',
          invoice_number: invoiceNumber,
          amount: project.maintenance_cost,
          due_date: dueDate,
          status: 'pending',
          description: `Recurring maintenance fee for project: ${project.name || project.title} (${project.maintenance_frequency || 'monthly'})`,
          created_at: new Date().toISOString(),
        });

        // Advance next billing date
        const nextDate = new Date(billingDate);
        if (project.maintenance_frequency === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        await db.ref(`workspaces/${wsId}/projects/${projectId}`).update({
          next_billing_date: nextDate.toISOString(),
        });

        billingResults.push({
          workspace: wsId,
          project: project.name || project.title,
          invoice: invoiceNumber,
          status: 'success',
        });
      }
    }

    return NextResponse.json({
      processed: true,
      timestamp: new Date().toISOString(),
      results: billingResults,
    });
  } catch (error) {
    console.error('Cron Billing Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
