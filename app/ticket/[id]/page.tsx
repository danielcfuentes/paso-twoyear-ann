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

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

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
        <span className="font-display text-xl tracking-wider" style={{ color: '#E8402A' }}>PASO</span>
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
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: 'rgba(232,64,42,0.2)', color: '#E8402A', fontSize: 9 }}>{i + 1}</span>
                      <span className="text-white/80 font-body text-sm">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Perforated divider */}
          <div
            className="flex items-center gap-0 px-0"
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
            onClick={() => window.print()}
            className="w-full py-5 rounded-2xl font-display text-2xl tracking-widest text-white"
            style={{ background: '#E8402A', boxShadow: '0 4px 32px rgba(232,64,42,0.35)' }}
          >
            SAVE / PRINT
          </button>
        </div>

        <p className="text-center text-white/15 text-xs mt-8 font-body">@pasorunclub</p>
      </div>
    </div>
  );
}
