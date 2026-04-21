import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TICKET_TYPES } from '@/lib/tickets';

export const dynamic = 'force-dynamic';

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

// GET — verify a ticket by its code
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE ticket_code = ?').get(code) as
    | Record<string, unknown>
    | undefined;

  if (!order) {
    return NextResponse.json({ valid: false, reason: 'INVALID', message: 'Ticket not found.' }, { status: 404 });
  }

  if (order.status !== 'approved') {
    return NextResponse.json({ valid: false, reason: 'NOT_APPROVED', message: 'Ticket is not approved.' });
  }

  const typeMeta = TICKET_TYPES[order.ticket_type as keyof typeof TICKET_TYPES];

  if (order.checked_in) {
    return NextResponse.json({
      valid: false,
      reason: 'ALREADY_USED',
      alreadyUsed: true,
      message: 'This ticket has already been checked in.',
      checked_in_at: order.checked_in_at,
      order: {
        full_name: order.full_name,
        ticket_type: typeMeta?.name ?? order.ticket_type,
        people_count: order.people_count,
      },
    });
  }

  return NextResponse.json({
    valid: true,
    order: {
      full_name: order.full_name,
      instagram: order.instagram,
      ticket_type: typeMeta?.name ?? order.ticket_type,
      ticket_count: order.ticket_count,
      people_count: order.people_count,
    },
  });
}

// POST — check in a ticket (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const db = getDb();
  const order = db
    .prepare('SELECT id, status, checked_in FROM orders WHERE ticket_code = ?')
    .get(code) as { id: string; status: string; checked_in: number } | undefined;

  if (!order || order.status !== 'approved') {
    return NextResponse.json({ error: 'Invalid ticket' }, { status: 404 });
  }

  if (order.checked_in) {
    return NextResponse.json({ error: 'Already checked in' }, { status: 409 });
  }

  db.prepare(`
    UPDATE orders SET checked_in = 1, checked_in_at = datetime('now') WHERE ticket_code = ?
  `).run(code);

  return NextResponse.json({ success: true });
}
