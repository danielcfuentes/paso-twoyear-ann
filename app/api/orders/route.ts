import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import {
  calculateAmount,
  calculatePeopleCount,
  TICKET_TYPES,
  TicketTypeId,
} from '@/lib/tickets';
import { sendSubmissionEmail } from '@/lib/email';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

// GET — list all orders (admin only)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const db = getDb();

  let query = 'SELECT * FROM orders';
  const params: string[] = [];

  if (status && status !== 'all') {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const orders = db.prepare(query).all(...params);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN amount_due END), 0) as revenue,
      COALESCE(SUM(CASE WHEN status IN ('pending','approved') THEN people_count END), 0) as spots_used
    FROM orders
  `).get();

  const totalCapacity = parseInt(process.env.TOTAL_CAPACITY || '100');

  return NextResponse.json({ orders, stats, totalCapacity });
}

// POST — create new order
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const full_name = (formData.get('full_name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const phone = (formData.get('phone') as string)?.trim();
    const instagram = (formData.get('instagram') as string)?.trim();
    const ticket_type = formData.get('ticket_type') as TicketTypeId;
    const ticket_count = parseInt(formData.get('ticket_count') as string);
    const proof_file = formData.get('proof') as File | null;

    if (!full_name || !email || !phone || !ticket_type || !ticket_count || !proof_file) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (!TICKET_TYPES[ticket_type]) {
      return NextResponse.json({ error: 'Invalid ticket type.' }, { status: 400 });
    }

    if (ticket_count < 1 || ticket_count > 10) {
      return NextResponse.json({ error: 'Invalid ticket count.' }, { status: 400 });
    }

    // File type check
    const ext = proof_file.name.split('.').pop()?.toLowerCase() || '';
    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPG, PNG, or PDF.' },
        { status: 400 }
      );
    }

    // File size check (10MB max)
    if (proof_file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
    }

    // Capacity check
    const db = getDb();
    const totalCapacity = parseInt(process.env.TOTAL_CAPACITY || '100');
    const { used } = db.prepare(`
      SELECT COALESCE(SUM(people_count), 0) as used
      FROM orders WHERE status IN ('pending', 'approved')
    `).get() as { used: number };

    const newPeople = calculatePeopleCount(ticket_type, ticket_count);
    if (used + newPeople > totalCapacity) {
      return NextResponse.json({ error: 'Not enough spots available.' }, { status: 400 });
    }

    // Save file
    const id = uuidv4();
    const filename = `${id}.${ext}`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const bytes = await proof_file.arrayBuffer();
    fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(bytes));

    const amount_due = calculateAmount(ticket_type, ticket_count);
    const people_count = newPeople;

    db.prepare(`
      INSERT INTO orders
        (id, full_name, email, phone, instagram, ticket_type, ticket_count, people_count, amount_due, payment_proof_filename)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, full_name, email, phone, instagram || null, ticket_type, ticket_count, people_count, amount_due, filename);

    // Fire-and-forget submission confirmation email
    sendSubmissionEmail({ full_name, email, ticket_count, amount_due, id }).catch(console.error);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Order creation error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
