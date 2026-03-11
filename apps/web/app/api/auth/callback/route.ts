import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Frontend will exchange refresh cookie for access token via /auth/refresh.
  // Use forwarded headers from reverse proxy to get the public URL (not internal 0.0.0.0:8080)
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const dashboardUrl = new URL('/dashboard', `${proto}://${host}`);

  return NextResponse.redirect(dashboardUrl);
}
