'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type TicketData = {
  qrCode: string;
  ticketCode: string;
  order: {
    id: string;
    full_name: string;
    instagram: string | null;
    ticket_type: string;
    ticket_count: number;
    people_count: number;
    amount_due: number;
    guest_names: string[];
  };
};

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

async function drawTicketCanvas(ticket: TicketData): Promise<HTMLCanvasElement> {
  const S = 2;
  const W = 560, RED = '#E8402A';
  const guests = [ticket.order.full_name, ...ticket.order.guest_names];
  const hasGuests = ticket.order.guest_names.length > 0;
  const guestH = hasGuests ? 24 + guests.length * 26 : 0;
  const H = 820 + guestH;

  const canvas = document.createElement('canvas');
  canvas.width = W * S; canvas.height = H * S;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(S, S);

  // Background
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

  // Card
  rr(ctx, 16, 16, W - 32, H - 32, 22);
  ctx.fillStyle = '#0a0a0a'; ctx.fill();
  ctx.strokeStyle = 'rgba(232,64,42,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();

  // Header band
  const grad = ctx.createLinearGradient(16, 16, W - 16, 180);
  grad.addColorStop(0, '#120500'); grad.addColorStop(1, '#0d0d0d');
  rr(ctx, 16, 16, W - 32, 195 + guestH, 22);
  ctx.fillStyle = grad; ctx.fill();

  // "YOUR TICKET"
  ctx.fillStyle = RED; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillText('YOUR TICKET', W / 2, 52);
  ctx.letterSpacing = '0px';

  // Event name
  ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Impact, Arial';
  ctx.fillText('2 YEAR ANNIVERSARY', W / 2, 84);

  // Red accent line
  ctx.fillStyle = RED; ctx.fillRect(W / 2 - 24, 93, 48, 2);

  // Name
  ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Impact, Arial';
  ctx.fillText(ticket.order.full_name.toUpperCase(), W / 2, 134);

  // Instagram
  let infoY = 156;
  if (ticket.order.instagram) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '14px Arial';
    ctx.fillText(`@${ticket.order.instagram}`, W / 2, infoY);
    infoY += 22;
  }

  // Date / Time / Guests
  const cols = [{ label: 'DATE', val: 'APR 28' }, { label: 'TIME', val: '7:00 PM' }, { label: 'GUESTS', val: String(ticket.order.people_count) }];
  const colW = (W - 80) / 3;
  cols.forEach(({ label, val }, i) => {
    const cx = 56 + colW * i + colW / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
    ctx.letterSpacing = '2px'; ctx.fillText(label, cx, infoY + 12); ctx.letterSpacing = '0px';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Impact, Arial';
    ctx.fillText(val, cx, infoY + 34);
  });
  infoY += 54;

  // Guest names
  if (hasGuests) {
    infoY += 10;
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(40, infoY, W - 80, 1);
    infoY += 14;
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '10px Arial'; ctx.letterSpacing = '2px';
    ctx.textAlign = 'left'; ctx.fillText('PARTY', 44, infoY + 10); ctx.letterSpacing = '0px'; ctx.textAlign = 'center';
    infoY += 18;
    guests.forEach((name, i) => {
      ctx.fillStyle = RED; ctx.font = 'bold 11px Arial';
      ctx.fillText(String(i + 1), 56, infoY + 1);
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '14px Arial'; ctx.textAlign = 'left';
      ctx.fillText(name, 72, infoY + 1);
      ctx.textAlign = 'center';
      infoY += 26;
    });
  }

  // Perforated separator
  const sepY = 16 + 195 + guestH;
  ctx.strokeStyle = 'rgba(232,64,42,0.35)'; ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(32, sepY); ctx.lineTo(W - 32, sepY); ctx.stroke();
  ctx.setLineDash([]);
  // notches
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(16, sepY, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W - 16, sepY, 9, Math.PI * 2, 0); ctx.fill();

  // Ticket type / Paid row
  const midY = sepY + 16;
  ctx.fillStyle = '#0d0d0d'; ctx.fillRect(16, midY, W - 32, 70);
  ctx.strokeStyle = 'rgba(232,64,42,0.25)'; ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(32, midY + 70); ctx.lineTo(W - 32, midY + 70); ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '10px Arial'; ctx.letterSpacing = '2px';
  ctx.fillText('TICKET', 44, midY + 20); ctx.letterSpacing = '0px';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Impact, Arial';
  ctx.fillText('General Admission', 44, midY + 46);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '10px Arial'; ctx.letterSpacing = '2px';
  ctx.fillText('PAID', W - 44, midY + 20); ctx.letterSpacing = '0px';
  ctx.fillStyle = RED; ctx.font = 'bold 24px Impact, Arial';
  ctx.fillText(`$${ticket.order.amount_due}`, W - 44, midY + 48);
  ctx.textAlign = 'center';

  // QR code section
  const qrY = midY + 86;
  ctx.fillStyle = '#080808'; ctx.fillRect(16, qrY, W - 32, 280);

  const qrImg = new Image();
  qrImg.src = ticket.qrCode;
  await new Promise<void>(resolve => { qrImg.onload = () => resolve(); });

  // White QR container
  const qrSize = 200;
  const qrX = (W - qrSize) / 2;
  rr(ctx, qrX - 14, qrY + 18, qrSize + 28, qrSize + 28, 16);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.drawImage(qrImg, qrX, qrY + 32, qrSize, qrSize);

  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '12px Arial';
  ctx.fillText('Scan at the door for entry', W / 2, qrY + qrSize + 60);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = '11px monospace';
  ctx.fillText(ticket.ticketCode.slice(0, 8).toUpperCase(), W / 2, qrY + qrSize + 80);

  // Venue footer
  const venueY = qrY + 282;
  const venueGrad = ctx.createLinearGradient(16, venueY, W - 16, venueY + 80);
  venueGrad.addColorStop(0, '#120500'); venueGrad.addColorStop(1, '#0d0d0d');
  rr(ctx, 16, venueY, W - 32, H - venueY - 16, 22);
  ctx.fillStyle = venueGrad; ctx.fill();

  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Impact, Arial';
  ctx.fillText('PANORAMA RESTAURANT', W / 2, venueY + 36);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '13px Arial';
  ctx.fillText('8710 Astoria Blvd · Flushing, NY', W / 2, venueY + 58);

  return canvas;
}

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${params.id}/ticket`)
      .then(r => { if (!r.ok) throw new Error('Ticket not available'); return r.json(); })
      .then(d => { setTicket(d); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="font-display text-2xl tracking-widest text-white/30">LOADING TICKET...</p>
      </div>
    );
  }

  if (err || !ticket) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="font-display text-3xl text-white/20">TICKET NOT READY</p>
        <p className="text-white/40 font-body text-sm">Your ticket will appear here once your order is approved.</p>
        <a href={`/confirmation/${params.id}`} className="text-[#E8402A] font-body text-sm underline">
          Check order status →
        </a>
      </div>
    );
  }

  async function handleSave() {
    if (!ticket || saving) return;
    setSaving(true);
    try {
      const canvas = await drawTicketCanvas(ticket);
      const filename = `paso-ticket-${ticket.ticketCode.slice(0, 8).toUpperCase()}.png`;

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png')
      );
      const file = new File([blob], filename, { type: 'image/png' });

      // Use native share sheet if available (iOS + Android) — user taps "Save Image"
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'PASO Ticket' });
        return;
      }

      // Desktop fallback: direct download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-black text-white pb-12"
      style={{ background: 'radial-gradient(ellipse at top, #1a0500 0%, #000 50%)' }}
    >
      {/* Nav */}
      <div
        className="flex items-center justify-between px-5 py-4 no-print"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <a href="/" className="text-white/30 hover:text-white transition-colors text-sm font-body">← Home</a>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/paso-logo.png" alt="PASO" className="h-7" />
        <div className="w-12" />
      </div>

      <div className="px-5 pt-8 max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="font-display text-[#E8402A] text-sm tracking-[0.4em] mb-1">YOUR TICKET</p>
          <h1 className="font-display text-4xl text-white leading-tight">
            2 YEAR<br />ANNIVERSARY
          </h1>
        </div>

        {/* Ticket card */}
        <div
          className="rounded-3xl overflow-hidden mb-6"
          style={{
            border: '1.5px solid rgba(232,64,42,0.4)',
            boxShadow: '0 0 60px rgba(232,64,42,0.12)',
            background: '#0a0a0a',
          }}
        >
          {/* Top — attendee info */}
          <div
            className="px-6 pt-6 pb-5"
            style={{ background: 'linear-gradient(135deg, #120500 0%, #0d0d0d 100%)' }}
          >
            <p className="font-display text-2xl text-white leading-tight">{ticket.order.full_name}</p>
            {ticket.order.instagram && (
              <p className="text-white/40 font-body text-sm mt-0.5">@{ticket.order.instagram}</p>
            )}
            <div className="flex gap-5 mt-4">
              {[
                { label: 'DATE', val: 'APR 28' },
                { label: 'TIME', val: '7:00 PM' },
                { label: 'GUESTS', val: String(ticket.order.people_count) },
              ].map(({ label, val }) => (
                <div key={label}>
                  <p className="text-xs text-white/30 tracking-widest font-body">{label}</p>
                  <p className="font-display text-lg text-white mt-0.5">{val}</p>
                </div>
              ))}
            </div>
            {ticket.order.guest_names && ticket.order.guest_names.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/30 tracking-widest font-body mb-2">PARTY</p>
                <div className="space-y-1">
                  {[ticket.order.full_name, ...ticket.order.guest_names].map((name, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(232,64,42,0.2)', color: '#E8402A', fontSize: 9 }}>{i + 1}</span>
                      <span className="text-white/80 font-body text-sm">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Perforated divider */}
          <div
            className="flex items-center px-0"
            style={{ borderTop: '1px dashed rgba(232,64,42,0.35)' }}
          >
            <div className="w-4 h-4 rounded-full -ml-2 flex-shrink-0" style={{ background: '#000' }} />
            <div className="flex-1" />
            <div className="w-4 h-4 rounded-full -mr-2 flex-shrink-0" style={{ background: '#000' }} />
          </div>

          {/* Middle — ticket type */}
          <div
            className="px-6 py-4 flex justify-between items-center"
            style={{ background: '#0d0d0d', borderBottom: '1px dashed rgba(232,64,42,0.35)' }}
          >
            <div>
              <p className="text-xs text-white/25 uppercase tracking-widest font-body">Ticket</p>
              <p className="font-display text-xl text-white mt-0.5">{ticket.order.ticket_type}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/25 uppercase tracking-widest font-body">Paid</p>
              <p className="font-display text-xl mt-0.5" style={{ color: '#E8402A' }}>${ticket.order.amount_due}</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="p-6 flex flex-col items-center" style={{ background: '#080808' }}>
            <div className="bg-white p-3 rounded-2xl mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ticket.qrCode} alt="Ticket QR" className="w-52 h-52 block" />
            </div>
            <p className="text-white/25 text-xs font-body text-center">Scan at the door for entry</p>
            <p className="text-white/15 font-mono text-xs mt-1">{ticket.ticketCode.slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Bottom — venue */}
          <div
            className="px-6 py-4 text-center"
            style={{ background: 'linear-gradient(135deg, #120500 0%, #0d0d0d 100%)' }}
          >
            <p className="font-display text-lg text-white">PANORAMA RESTAURANT</p>
            <p className="text-white/35 font-body text-xs mt-0.5">8710 Astoria Blvd · Flushing, NY</p>
          </div>
        </div>

        {/* Actions */}
        <div className="no-print">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-5 rounded-2xl font-display text-2xl tracking-widest text-white"
            style={{ background: '#E8402A', boxShadow: '0 4px 32px rgba(232,64,42,0.35)', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'SAVING...' : 'SAVE AS PHOTO'}
          </button>
          <p className="text-center text-white/20 text-xs font-body mt-3">Tap Save Image from the share sheet to add to Photos</p>
        </div>

        <p className="text-center text-white/15 text-xs mt-8 font-body">@pasorunclub</p>
      </div>
    </div>
  );
}
