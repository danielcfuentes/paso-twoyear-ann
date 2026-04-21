import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
  }

  const db = getDb();
  const orders = db.prepare(`
    SELECT id, full_name, ticket_count, amount_due, status, created_at
    FROM orders
    WHERE email = ?
    ORDER BY created_at DESC
  `).all(email.toLowerCase().trim()) as {
    id: string;
    full_name: string;
    ticket_count: number;
    amount_due: number;
    status: string;
    created_at: string;
  }[];

  return NextResponse.json({ orders });
}
