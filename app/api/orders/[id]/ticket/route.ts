import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import QRCode from 'qrcode';
import { TICKET_TYPES } from '@/lib/tickets';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;

  if (!order || order.status !== 'approved' || !order.ticket_code) {
    return NextResponse.json({ error: 'Ticket not available' }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/scan/${order.ticket_code}`;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  const typeMeta = TICKET_TYPES[order.ticket_type as keyof typeof TICKET_TYPES];

  let guest_names: string[] = [];
  try { guest_names = JSON.parse((order.guest_names as string) || '[]'); } catch (_) {}

  return NextResponse.json({
    qrCode: qrDataUrl,
    ticketCode: order.ticket_code,
    verifyUrl,
    order: {
      id,
      full_name: order.full_name,
      instagram: order.instagram,
      ticket_type: typeMeta?.name ?? order.ticket_type,
      ticket_count: order.ticket_count,
      people_count: order.people_count,
      amount_due: order.amount_due,
      guest_names,
    },
  });
}
