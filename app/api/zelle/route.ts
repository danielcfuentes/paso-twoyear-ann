import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    name: process.env.ZELLE_NAME ?? 'PASO Run Club',
    email: process.env.ZELLE_EMAIL ?? process.env.ZELLE_PHONE ?? 'Contact @pasorunclub',
  });
}
