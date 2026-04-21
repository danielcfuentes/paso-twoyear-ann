import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendWaitlistConfirmEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { email, full_name } = await req.json();

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
  }

  const db = getDb();

  try {
    db.prepare('INSERT INTO waitlist (email, full_name) VALUES (?, ?)').run(email, full_name ?? null);
  } catch {
    // Duplicate — already on list
    return NextResponse.json({ success: true, alreadyOnList: true });
  }

  sendWaitlistConfirmEmail(email, full_name ?? '').catch(console.error);

  return NextResponse.json({ success: true });
}
