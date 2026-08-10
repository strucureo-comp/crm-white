import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    // Generate a secure secret
    const secret = authenticator.generateSecret();
    
    // Create the otpauth url
    const otpauth = authenticator.keyuri(email, 'Tagverse CRM', secret);
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpauth);
    
    return NextResponse.json({
      secret,
      qrCode
    });
  } catch (error) {
    console.error('2FA Generation error:', error);
    return NextResponse.json({ error: 'Failed to generate 2FA secret' }, { status: 500 });
  }
}
