import { NextResponse } from 'next/server';
import { createEnquiry } from '@/lib/firebase/database';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(str: string): string {
  return str.replace(/[<>&"']/g, '').trim();
}

const MAX_LENGTHS = { name: 100, email: 254, subject: 200, message: 5000, phone: 30 };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message, phone } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid field types' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (name.length > MAX_LENGTHS.name || email.length > MAX_LENGTHS.email || message.length > MAX_LENGTHS.message) {
      return NextResponse.json(
        { error: 'Field too long' },
        { status: 400 }
      );
    }

    const enquiryId = await createEnquiry({
      name: sanitize(name),
      email: sanitize(email),
      subject: subject ? sanitize(String(subject).slice(0, MAX_LENGTHS.subject)) : 'New Website Enquiry',
      message: sanitize(message),
      phone: phone ? sanitize(String(phone).slice(0, MAX_LENGTHS.phone)) : '',
      status: 'new',
    });

    if (!enquiryId) {
      throw new Error('Failed to create enquiry');
    }

    return NextResponse.json({ success: true, id: enquiryId });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
