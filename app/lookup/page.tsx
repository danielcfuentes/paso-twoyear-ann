'use client';

import { useState } from 'react';

type OrderResult = {
  id: string;
  full_name: string;
  ticket_count: number;
  amount_due: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

const STATUS_CONFIG = {
  pending:  { label: 'UNDER REVIEW', color: '#E8402A', bg: 'rgba(232,64,42,0.1)',  border: 'rgba(232,64,42,0.3)',  icon: '⏳' },
  approved: { label: 'CONFIRMED',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)',  icon: '✓' },
  rejected: { label: 'NOT APPROVED', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  icon: '✗' },
};

export default function LookupPage() {
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState<OrderResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function handleLookup() {
    if (!email || !email.includes('@')) { setError('Enter a valid email address.'); return; }
    setLoading(true); setError(''); setSearched(false);
    try {
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders);
      setSearched(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-5 py-10 max-w-md mx-auto">
      {/* Nav */}
      <div className="flex items-center justify-between mb-10">
        <a href="/" className="text-white/30 hover:text-white transition-colors text-sm font-body">← Home</a>
        <span className="font-display text-xl tracking-wider" style={{ color: '#E8402A' }}>PASO</span>
        <div className="w-12" />
      </div>

      {/* Header */}
      <div className="mb-8">
        <p className="font-display text-[#E8402A] text-sm tracking-[0.4em] mb-2">FIND YOUR TICKET</p>
        <h1 className="font-display text-5xl text-white leading-tight">
          LOOK UP<br />MY ORDER
        </h1>
        <p className="text-white/40 font-body text-sm mt-3">
          Enter the email you used when you bought your ticket.
        </p>
      </div>

      {/* Search form */}
      <div className="space-y-3 mb-8">
        <input
          type="email"
          className="form-input"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
        />
        {error && (
          <p className="text-sm font-body px-1" style={{ color: '#ef4444' }}>{error}</p>
        )}
        <button
          onClick={handleLookup}
          disabled={loading}
          className="w-full py-5 rounded-2xl font-display text-2xl tracking-widest text-white transition-opacity"
          style={{ background: '#E8402A', opacity: loading ? 0.6 : 1, boxShadow: '0 4px 32px rgba(232,64,42,0.3)' }}
        >
          {loading ? 'SEARCHING...' : 'FIND MY TICKET'}
        </button>
      </div>

      {/* Results */}
      {searched && orders !== null && (
        <div>
          {orders.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="font-display text-2xl text-white/30 mb-2">NO ORDERS FOUND</p>
              <p className="text-white/30 font-body text-sm">
                No orders found for <strong className="text-white/50">{email}</strong>.
                Make sure you&apos;re using the same email you checked out with.
              </p>
              <a
                href="https://www.instagram.com/pasorunclub/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-sm font-body"
                style={{ color: '#E8402A' }}
              >
                DM @pasorunclub for help →
              </a>
            </div>
          ) : (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-3 font-body">
                {orders.length} order{orders.length !== 1 ? 's' : ''} found
              </p>
              <div className="space-y-3">
                {orders.map(order => {
                  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: '#0d0d0d', border: `1px solid ${cfg.border}` }}
                    >
                      {/* Status bar */}
                      <div
                        className="px-4 py-2 flex items-center justify-between"
                        style={{ background: cfg.bg }}
                      >
                        <span className="font-display tracking-widest text-sm" style={{ color: cfg.color }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="text-xs font-body" style={{ color: cfg.color }}>
                          {new Date(order.created_at + 'Z').toLocaleDateString()}
                        </span>
                      </div>

                      {/* Order info */}
                      <div className="px-4 py-4">
                        <p className="font-display text-xl text-white mb-3">{order.full_name}</p>
                        <div className="flex justify-between text-sm font-body text-white/50 mb-4">
                          <span>{order.ticket_count} ticket{order.ticket_count !== 1 ? 's' : ''}</span>
                          <span className="font-display text-lg" style={{ color: '#E8402A' }}>${order.amount_due}</span>
                        </div>

                        <div className="space-y-2">
                          <a
                            href={`/confirmation/${order.id}`}
                            className="block w-full py-3 rounded-xl font-display tracking-widest text-center text-sm"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
                          >
                            VIEW ORDER STATUS
                          </a>
                          {order.status === 'approved' && (
                            <a
                              href={`/ticket/${order.id}`}
                              className="block w-full py-3 rounded-xl font-display tracking-widest text-center text-sm text-white"
                              style={{ background: '#E8402A', boxShadow: '0 4px 20px rgba(232,64,42,0.3)' }}
                            >
                              VIEW TICKET & QR →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-white/15 text-xs mt-10 font-body">@pasorunclub</p>
    </div>
  );
}
