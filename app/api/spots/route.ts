import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const totalCapacity = parseInt(process.env.TOTAL_CAPACITY || '100');

  const result = db.prepare(`
    SELECT COALESCE(SUM(people_count), 0) as used
    FROM orders
    WHERE status IN ('pending', 'approved')
  `).get() as { used: number };

  const spotsLeft = Math.max(0, totalCapacity - result.used);

  return NextResponse.json({ spotsLeft, totalCapacity, spotsUsed: result.used });
}
