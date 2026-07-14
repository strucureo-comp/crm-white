import { NextResponse } from 'next/server';
import { getProjects, createInvoice, updateProject } from '@/lib/firebase/database';

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
    const projects = await getProjects();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const billingResults = [];

    for (const project of projects) {
      if (project.maintenance_cost && project.next_billing_date) {
        const billingDate = new Date(project.next_billing_date);
        billingDate.setHours(0, 0, 0, 0);

        if (today >= billingDate) {
          const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${project.title.slice(0, 3).toUpperCase()}`;

          const invoiceId = await createInvoice({
            project_id: project.id,
            client_id: project.client_id,
            invoice_number: invoiceNumber,
            amount: project.maintenance_cost,
            due_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            description: `Recurring maintenance fee for project: ${project.title} (${project.maintenance_frequency})`,
          });

          if (invoiceId) {
            const nextDate = new Date(billingDate);
            if (project.maintenance_frequency === 'yearly') {
              nextDate.setFullYear(nextDate.getFullYear() + 1);
            } else {
              nextDate.setMonth(nextDate.getMonth() + 1);
            }

            await updateProject(project.id, {
              next_billing_date: nextDate.toISOString()
            });

            billingResults.push({
              project: project.title,
              invoice: invoiceNumber,
              status: 'success'
            });
          } else {
            billingResults.push({
              project: project.title,
              status: 'failed',
              error: 'Failed to create invoice'
            });
          }
        }
      }
    }

    return NextResponse.json({
      processed: true,
      timestamp: new Date().toISOString(),
      results: billingResults
    });

  } catch (error) {
    console.error('Cron Billing Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
