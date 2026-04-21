import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { sendConfirmationEmail, sendRejectionEmail } from '@/lib/email';
import { TICKET_TYPES } from '@/lib/tickets';

export const dynamic = 'force-dynamic';

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

// GET — get single order (public, for confirmation page)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Strip sensitive file path from public response
  const { payment_proof_filename: _proof, ...safeOrder } = order as Record<string, unknown>;
  return NextResponse.json(safeOrder);
}

// PATCH — update order status (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Check-in action
  if (body.action === 'check_in') {
    if (order.status !== 'approved') {
      return NextResponse.json({ error: 'Order must be approved to check in.' }, { status: 400 });
    }
    if (order.checked_in) {
      return NextResponse.json({ error: 'Already checked in.' }, { status: 409 });
    }
    db.prepare(`UPDATE orders SET checked_in = 1, checked_in_at = datetime('now') WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  }

  const { status, notes } = body;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  let ticket_code = order.ticket_code as string | null;

  if (status === 'approved' && !ticket_code) {
    ticket_code = uuidv4();
  }

  db.prepare(`
    UPDATE orders SET status = ?, notes = ?, ticket_code = ? WHERE id = ?
  `).run(status, notes ?? order.notes, ticket_code, id);

  try {
    const typeMeta = TICKET_TYPES[order.ticket_type as keyof typeof TICKET_TYPES];
    if (status === 'approved') {
      sendConfirmationEmail({
        full_name: order.full_name as string,
        email: order.email as string,
        ticket_type: typeMeta?.name ?? (order.ticket_type as string),
        ticket_count: order.ticket_count as number,
        amount_due: order.amount_due as number,
        id,
      }).catch(console.error);
    } else if (status === 'rejected') {
      sendRejectionEmail({
        full_name: order.full_name as string,
        email: order.email as string,
      }).catch(console.error);
    }
  } catch (_) {}

  return NextResponse.json({ success: true });
}
