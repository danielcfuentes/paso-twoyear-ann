'use client';

import { useEffect, useState, useCallback } from 'react';

type Order = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  instagram: string | null;
  ticket_type: string;
  ticket_count: number;
  people_count: number;
  amount_due: number;
  status: 'pending' | 'approved' | 'rejected';
  checked_in: number;
  checked_in_at: string | null;
  created_at: string;
};

type Stats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  revenue: number;
  spots_used: number;
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: 'Pending',  bg: 'rgba(232,64,42,0.15)',  color: '#E8402A' },
  approved: { label: 'Approved', bg: 'rgba(34,197,94,0.15)',  color: '#22c55e' },
  rejected: { label: 'Rejected', bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [totalCapacity, setTotalCapacity] = useState(150);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState('');

  const fetchOrders = useCallback(async (password: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?status=${filter}`, {
        headers: { 'x-admin-password': password },
      });
      if (!res.ok) {
        if (res.status === 401) { setAuthed(false); setAdminPw(''); }
        return;
      }
      const data = await res.json();
      setOrders(data.orders ?? []);
      setStats(data.stats ?? null);
      setTotalCapacity(data.totalCapacity ?? 150);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (authed && adminPw) fetchOrders(adminPw);
  }, [authed, adminPw, filter, fetchOrders]);

  function handleLogin() {
    if (!pw.trim()) return;
    fetch('/api/orders', { headers: { 'x-admin-password': pw } }).then(r => {
      if (r.ok) { setAdminPw(pw); setAuthed(true); setPwError(''); }
      else setPwError('Incorrect password.');
    });
  }

  async function updateStatus(orderId: string, status: string) {
    setActionLoading(orderId + status);
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPw },
      body: JSON.stringify({ status }),
    });
    await fetchOrders(adminPw);
    setSelectedOrder(null);
    setActionLoading('');
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="font-display text-6xl" style={{ color: '#E8402A' }}>PASO</p>
            <p className="font-display text-xl text-white/40 tracking-[0.3em]">ADMIN</p>
          </div>
          <div className="rounded-2xl p-6" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}>
            <label className="block text-xs text-white/30 uppercase tracking-widest mb-2 font-body">Password</label>
            <input
              type="password"
              className="form-input mb-4"
              placeholder="Enter admin password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            {pwError && <p className="text-red-400 text-sm mb-4 font-body">{pwError}</p>}
            <button
              onClick={handleLogin}
              className="w-full py-4 rounded-xl font-display text-xl tracking-widest text-white"
              style={{ background: '#E8402A' }}
            >
              ENTER
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div
        className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="font-display text-xl tracking-wider" style={{ color: '#E8402A' }}>PASO ADMIN</span>
        <div className="flex gap-2">
          <button
            onClick={() => fetchOrders(adminPw)}
            className="px-3 py-1.5 rounded-lg text-xs font-body text-white/40 hover:text-white transition-colors"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Refresh
          </button>
          <button
            onClick={() => { setAuthed(false); setAdminPw(''); setPw(''); }}
            className="px-3 py-1.5 rounded-lg text-xs font-body text-white/40 hover:text-white transition-colors"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Log Out
          </button>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
            {[
              { label: 'Total',    value: stats.total,       color: '#fff' },
              { label: 'Pending',  value: stats.pending,     color: '#E8402A' },
              { label: 'Approved', value: stats.approved,    color: '#22c55e' },
              { label: 'Revenue',  value: `$${stats.revenue}`, color: '#E8402A' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/30 font-body mb-1 uppercase tracking-wider">{s.label}</p>
                <p className="font-display text-2xl" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {stats && (
          <div className="rounded-xl p-4 mb-5" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between mb-2">
              <span className="text-xs text-white/30 font-body uppercase tracking-wider">Capacity</span>
              <span className="text-xs text-white font-body">{stats.spots_used} / {totalCapacity}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: '#1a1a1a' }}>
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (stats.spots_used / totalCapacity) * 100)}%`,
                  background: stats.spots_used / totalCapacity > 0.85 ? '#ef4444' : '#E8402A',
                }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 py-2 rounded-lg text-xs font-display tracking-widest capitalize transition-all"
              style={{
                background: filter === f ? '#E8402A' : 'transparent',
                color: filter === f ? '#fff' : 'rgba(255,255,255,0.35)',
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-white/20 font-display text-2xl tracking-widest">LOADING...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-white/20 font-display text-2xl tracking-widest">NO ORDERS</div>
        ) : (
          <div className="space-y-2">
            {orders.map(order => {
              const badge = STATUS_BADGE[order.status];
              return (
                <div
                  key={order.id}
                  className="rounded-2xl p-4 transition-all hover:border-white/10"
                  style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg text-white truncate">{order.full_name}</p>
                      <p className="text-xs text-white/35 font-body truncate mt-0.5">{order.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-display tracking-wider"
                        style={{ background: badge?.bg, color: badge?.color }}
                      >
                        {badge?.label?.toUpperCase()}
                      </span>
                      <span className="font-display text-base" style={{ color: '#E8402A' }}>${order.amount_due}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-xs text-white/25 font-body">
                      {order.ticket_count} ticket{order.ticket_count !== 1 ? 's' : ''} · {order.people_count} {order.people_count === 1 ? 'person' : 'people'}
                    </span>
                    <span className="text-xs text-white/20 font-body">
                      {new Date(order.created_at + 'Z').toLocaleDateString()}
                    </span>
                  </div>
                  {order.checked_in === 1 && (
                    <div className="mt-2 px-2 py-1 rounded text-xs text-center font-display tracking-wider" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e' }}>
                      ✓ CHECKED IN
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', cursor: 'default' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedOrder(null); }}
        >
          <div
            className="w-full max-w-md rounded-3xl overflow-hidden max-h-[92vh] overflow-y-auto"
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="font-display text-xl tracking-wider text-white">{selectedOrder.full_name}</p>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-white/30 hover:text-white text-2xl leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="space-y-2.5 text-sm font-body">
                {[
                  { label: 'Email',     val: selectedOrder.email },
                  { label: 'Phone',     val: selectedOrder.phone },
                  { label: 'Instagram', val: selectedOrder.instagram ? `@${selectedOrder.instagram}` : '—' },
                  { label: 'Tickets',   val: `${selectedOrder.ticket_count} × General Admission` },
                  { label: 'Guests',    val: `${selectedOrder.people_count} people` },
                  { label: 'Submitted', val: new Date(selectedOrder.created_at + 'Z').toLocaleString() },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-white/30">{label}</span>
                    <span className="text-white text-right">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-white/30">Amount</span>
                  <span className="font-display text-xl" style={{ color: '#E8402A' }}>${selectedOrder.amount_due}</span>
                </div>
              </div>

              <a
                href={`/api/orders/${selectedOrder.id}/proof?pw=${adminPw}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl font-body text-sm"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.07)', color: '#E8402A' }}
              >
                <span>View Payment Screenshot</span>
                <span>→</span>
              </a>

              {selectedOrder.status === 'approved' && (
                <a
                  href={`/ticket/${selectedOrder.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl font-body text-sm"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}
                >
                  <span>View Ticket & QR Code</span>
                  <span>→</span>
                </a>
              )}

              <div className="space-y-2 pt-1">
                {selectedOrder.status !== 'approved' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'approved')}
                    disabled={!!actionLoading}
                    className="w-full py-4 rounded-xl font-display text-xl tracking-widest text-white transition-opacity"
                    style={{ background: '#22c55e', opacity: actionLoading ? 0.5 : 1, boxShadow: '0 4px 24px rgba(34,197,94,0.25)' }}
                  >
                    {actionLoading === selectedOrder.id + 'approved' ? 'APPROVING...' : '✓ APPROVE & SEND TICKET'}
                  </button>
                )}
                {selectedOrder.status !== 'rejected' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'rejected')}
                    disabled={!!actionLoading}
                    className="w-full py-4 rounded-xl font-display text-xl tracking-widest transition-opacity"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#ef4444',
                      opacity: actionLoading ? 0.5 : 1,
                    }}
                  >
                    {actionLoading === selectedOrder.id + 'rejected' ? 'REJECTING...' : '✗ REJECT ORDER'}
                  </button>
                )}
                {selectedOrder.status !== 'pending' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'pending')}
                    disabled={!!actionLoading}
                    className="w-full py-3 rounded-xl font-display text-lg tracking-widest transition-opacity"
                    style={{
                      background: '#141414',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.25)',
                      opacity: actionLoading ? 0.5 : 1,
                    }}
                  >
                    RESET TO PENDING
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
