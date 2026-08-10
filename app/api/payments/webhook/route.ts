import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { markInvoiceAsPaid } from '@/lib/firebase/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
  apiVersion: '2023-10-16' as any,
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'dummy_secret';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed.`, err.message);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const invoiceId = session.metadata?.invoiceId;
      const workspaceId = session.metadata?.workspaceId;

      if (invoiceId) {
        // Mark the invoice as paid in Firebase
        await markInvoiceAsPaid(invoiceId, {
          amount: (session.amount_total || 0) / 100,
          payment_method: 'Stripe Checkout',
          transaction_id: session.payment_intent as string,
        });
        console.log(`Invoice ${invoiceId} marked as paid successfully`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
