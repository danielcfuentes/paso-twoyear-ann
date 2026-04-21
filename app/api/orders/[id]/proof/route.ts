import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

function isAdmin(req: NextRequest) {
  const headerPw = req.headers.get('x-admin-password');
  const queryPw = new URL(req.url).searchParams.get('pw');
  return (headerPw || queryPw) === process.env.ADMIN_PASSWORD;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const order = db.prepare('SELECT payment_proof_filename FROM orders WHERE id = ?').get(id) as
    | { payment_proof_filename: string | null }
    | undefined;

  if (!order?.payment_proof_filename) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), 'uploads', order.payment_proof_filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const ext = order.payment_proof_filename.split('.').pop()?.toLowerCase() ?? '';
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    pdf: 'application/pdf',
  };

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${order.payment_proof_filename}"`,
    },
  });
}
