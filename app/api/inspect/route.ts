import { NextResponse } from 'next/server';
import { database } from '@/lib/firebase/config';
import { ref, get } from 'firebase/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const contactsSnap = await get(ref(database, 'workspaces/-OytSub0mXqtrJsUNGgX/contacts'));
    const contacts = contactsSnap.val() || {};

    const leadsSnap = await get(ref(database, 'leads'));
    const leads = leadsSnap.val() || {};

    return NextResponse.json({
      success: true,
      contacts,
      leads: Object.entries(leads)
        .filter(([id, lead]: any) => lead.company_id === '-OytSub0mXqtrJsUNGgX')
        .map(([id, lead]: any) => ({ id, name: lead.name, email: lead.email, company_id: lead.company_id })),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

