import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    const { database } = await import('@/lib/firebase/config');
    const { ref, get } = await import('firebase/database');
    const snap = await get(ref(database, '.info/connected'));
    checks.database = snap.val() ? 'connected' : 'disconnected';
    if (!snap.val()) healthy = false;
  } catch (e) {
    checks.database = `error: ${(e as Error).message}`;
    healthy = false;
  }

  return NextResponse.json({
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
}
