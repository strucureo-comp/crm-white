import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';

export async function POST(req: Request) {
  try {
    const { token, secret } = await req.json();
    
    if (!token || !secret) {
      return NextResponse.json({ error: 'Missing token or secret' }, { status: 400 });
    }
    
    const isValid = authenticator.verify({ token, secret });
    
    return NextResponse.json({ success: isValid });
  } catch (error) {
    console.error('2FA Verify error:', error);
    return NextResponse.json({ error: 'Failed to verify 2FA token' }, { status: 500 });
  }
}
