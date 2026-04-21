'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Order = {
  id: string;
  full_name: string;
  email: string;
  ticket_type: string;
  ticket_count: number;
  amount_due: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

const STATUS = {
  pending: {
    icon: '⏳',
    headline: 'UNDER REVIEW',
    sub: "We received your order and are reviewing your payment. You'll hear from us within 24 hours.",
    color: '#E8402A',
    bg: 'rgba(232,64,42,0.1)',
    border: 'rgba(232,64,42,0.3)',
  },
  approved: {
    icon: '✓',
    headline: 'CONFIRMED!',
    sub: "Your ticket is confirmed. Check your email for the QR code, or tap below to view it now.",
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.35)',
  },
  rejected: {
    icon: '✗',
    headline: 'NOT APPROVED',
    sub: "We couldn't verify your payment. DM @pasorunclub on Instagram for help.",
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
  },
};

export default function ConfirmationPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then(r => r.json())
      .then(d => { setOrder(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="font-display text-2xl tracking-widest text-white/30">LOADING...</p>
      </div>
    );
  }

  if (!order || 'error' in (order as object)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6 text-center">
        <div>
          <p className="font-display text-3xl text-white/20 mb-4">ORDER NOT FOUND</p>
          <a href="/" className="text-[#E8402A] font-body text-sm underline">← Go back home</a>
        </div>
      </div>
    );
  }

  const cfg = STATUS[order.status] ?? STATUS.pending;

  return (
    <div className="min-h-screen bg-black text-white px-5 py-10 max-w-md mx-auto">
      {/* Nav */}
      <div className="flex items-center justify-between mb-10">
        <a href="/" className="text-white/30 hover:text-white transition-colors text-sm font-body">← Home</a>
        <span className="font-display text-xl tracking-wider" style={{ color: '#E8402A' }}>PASO</span>
        <div className="w-12" />
      </div>

      {/* Status */}
      <div className="text-center mb-8">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: cfg.bg, border: `2px solid ${cfg.border}` }}
        >
          <span className="font-display text-5xl" style={{ color: cfg.color }}>{cfg.icon}</span>
        </div>
        <h1 className="font-display text-4xl mb-2" style={{ color: cfg.color }}>
          {cfg.headline}
        </h1>
        <p className="text-white/50 font-body text-sm leading-relaxed max-w-xs mx-auto">{cfg.sub}</p>
      </div>

      {/* Order details */}
      <div
        className="rounded-2xl p-5 mb-5"
        style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-xs text-white/25 uppercase tracking-widest mb-4 font-body">Order Details</p>
        <div className="space-y-3 text-sm font-body">
          {[
            { label: 'Name', val: order.full_name },
            { label: 'Email', val: order.email },
            { label: 'Tickets', val: `${order.ticket_count}× General Admission` },
            { label: 'Order ID', val: order.id.slice(0, 8).toUpperCase() },
          ].map(({ label, val }) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="text-white/35">{label}</span>
              <span className="text-white text-right">{val}</span>
            </div>
          ))}
          <div
            className="flex justify-between gap-4 pt-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-white/35">Total Paid</span>
            <span className="font-display text-xl" style={{ color: '#E8402A' }}>${order.amount_due}</span>
          </div>
        </div>
      </div>

      {/* CTA buttons */}
      {order.status === 'approved' && (
        <a
          href={`/ticket/${order.id}`}
          className="block w-full py-5 rounded-2xl font-display text-2xl tracking-widest text-center mb-3 text-white"
          style={{ background: '#E8402A', boxShadow: '0 4px 32px rgba(232,64,42,0.4)' }}
        >
          VIEW MY TICKET →
        </a>
      )}

      <a
        href="/"
        className="block w-full py-4 rounded-2xl font-display text-xl tracking-widest text-center"
        style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }}
      >
        BACK TO HOME
      </a>

      <p className="text-center text-white/15 text-xs mt-8 font-body">@pasorunclub</p>
    </div>
  );
}
