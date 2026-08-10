import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Since this route is under /api/v1/, middleware.ts has already authenticated the x-api-key 
  // and injected x-company-id and x-api-permission headers.
  
  const companyId = req.headers.get('x-company-id');
  const permission = req.headers.get('x-api-permission');
  
  return NextResponse.json({
    message: 'pong',
    authenticated: true,
    company_id: companyId,
    permission: permission,
    timestamp: new Date().toISOString()
  });
}
