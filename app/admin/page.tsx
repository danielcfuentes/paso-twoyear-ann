'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── QR Scanner Overlay ───────────────────────────────────────────────────
function QRScanner({ adminPw, onClose }: { adminPw: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [status, setStatus] = useState<'scanning' | 'checking' | 'success' | 'already' | 'error'>('scanning');
  const [resultOrder, setResultOrder] = useState<{ full_name: string; guest_names: string[]; people_count: number } | null>(null);
  const [resultMsg, setResultMsg] = useState('');
  const lastScanned = useRef('');

  useEffect(() => {
    let stream: MediaStream;
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          tick();
        }
      } catch {
        setStatus('error');
        setResultMsg('Camera access denied. Allow camera permission and try again.');
      }
    }

    async function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const jsQR = (await import('jsqr')).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

      if (code?.data && code.data !== lastScanned.current) {
        lastScanned.current = code.data;
        // Extract ticket code from URL: last path segment of /scan/{code}
        const match = code.data.match(/\/scan\/([a-f0-9-]{36})/i);
        if (!match) { setTimeout(() => { lastScanned.current = ''; }, 2000); rafRef.current = requestAnimationFrame(tick); return; }
        const ticketCode = match[1];
        setStatus('checking');
        try {
          const res = await fetch(`/api/verify/${ticketCode}`, {
            method: 'POST',
            headers: { 'x-admin-password': adminPw },
          });
          const data = await res.json();
          if (res.status === 409) {
            // Already checked in — fetch name
            const info = await fetch(`/api/verify/${ticketCode}`).then(r => r.json());
            setResultOrder(info.order ? { full_name: info.order.full_name, guest_names: info.order.guest_names ?? [], people_count: info.order.people_count ?? 1 } : null);
            setStatus('already');
          } else if (res.ok) {
            const info = await fetch(`/api/verify/${ticketCode}`).then(r => r.json());
            setResultOrder(info.order ? { full_name: info.order.full_name, guest_names: info.order.guest_names ?? [], people_count: info.order.people_count ?? 1 } : null);
            setStatus('success');
          } else {
            setResultMsg(data.error || 'Invalid ticket.');
            setStatus('error');
          }
        } catch {
          setResultMsg('Network error.');
          setStatus('error');
        }
        return; // stop scanning after a result
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [adminPw]);

  function reset() {
    lastScanned.current = '';
    setStatus('scanning');
    setResultOrder(null);
    setResultMsg('');
    // restart scanning
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    async function tick() {
      if (!videoRef.current || !canvasRef.current) return;
      if (videoRef.current.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      const jsQR = (await import('jsqr')).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (code?.data && code.data !== lastScanned.current) {
        lastScanned.current = code.data;
        const match = code.data.match(/\/scan\/([a-f0-9-]{36})/i);
        if (!match) { setTimeout(() => { lastScanned.current = ''; }, 2000); rafRef.current = requestAnimationFrame(tick); return; }
        const ticketCode = match[1];
        setStatus('checking');
        try {
          const res = await fetch(`/api/verify/${ticketCode}`, { method: 'POST', headers: { 'x-admin-password': adminPw } });
          const data = await res.json();
          if (res.status === 409) {
            const info = await fetch(`/api/verify/${ticketCode}`).then(r => r.json());
            setResultOrder(info.order ? { full_name: info.order.full_name, guest_names: info.order.guest_names ?? [], people_count: info.order.people_count ?? 1 } : null); setStatus('already');
          } else if (res.ok) {
            const info = await fetch(`/api/verify/${ticketCode}`).then(r => r.json());
            setResultOrder(info.order ? { full_name: info.order.full_name, guest_names: info.order.guest_names ?? [], people_count: info.order.people_count ?? 1 } : null); setStatus('success');
          } else {
            setResultMsg(data.error || 'Invalid ticket.'); setStatus('error');
          }
        } catch { setResultMsg('Network error.'); setStatus('error'); }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  const stateColor = status === 'success' ? '#22c55e' : status === 'already' ? '#f59e0b' : status === 'error' ? '#ef4444' : '#E8402A';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/paso-logo.png" alt="PASO" className="h-6" />
          <span className="font-display text-sm tracking-widest text-white/40">SCAN QR</span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white text-3xl leading-none transition-colors">×</button>
      </div>

      {/* Camera */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder */}
        {status === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              {/* Corner brackets */}
              {[['top-0 left-0', 'border-t-2 border-l-2'], ['top-0 right-0', 'border-t-2 border-r-2'], ['bottom-0 left-0', 'border-b-2 border-l-2'], ['bottom-0 right-0', 'border-b-2 border-r-2']].map(([pos, border]) => (
                <div key={pos} className={`absolute ${pos} w-8 h-8 ${border}`} style={{ borderColor: '#E8402A' }} />
              ))}
              {/* Scan line */}
              <div className="absolute left-0 right-0 h-0.5 top-1/2" style={{ background: 'rgba(232,64,42,0.7)', boxShadow: '0 0 8px #E8402A', animation: 'scanLine 2s ease-in-out infinite' }} />
            </div>
            <div className="absolute bottom-24 text-white/50 text-sm font-body text-center px-8">
              Point camera at a PASO ticket QR code
            </div>
          </div>
        )}

        {/* Result overlay */}
        {status !== 'scanning' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.92)' }}>
            {status === 'checking' ? (
              <>
                <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center mb-4" style={{ borderTopColor: '#E8402A', animation: 'spin 0.8s linear infinite' }} />
                <p className="font-display text-2xl tracking-widest text-white/60">CHECKING...</p>
              </>
            ) : (
              <>
                <div className="w-28 h-28 rounded-full flex items-center justify-center mb-6" style={{ background: `${stateColor}18`, border: `3px solid ${stateColor}`, boxShadow: `0 0 40px ${stateColor}40` }}>
                  <span className="font-display text-5xl" style={{ color: stateColor }}>
                    {status === 'success' ? '✓' : status === 'already' ? '⚠' : '✗'}
                  </span>
                </div>
                <p className="font-display text-4xl mb-2 text-center" style={{ color: stateColor }}>
                  {status === 'success' ? 'CHECKED IN!' : status === 'already' ? 'ALREADY IN' : 'INVALID'}
                </p>
                {resultOrder && (
                  <div className="w-full max-w-xs mb-2">
                    {/* Ticket holder */}
                    <p className="font-display text-2xl text-white text-center mb-3">{resultOrder.full_name}</p>
                    {/* Full party list */}
                    {resultOrder.guest_names.length > 0 && (
                      <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-xs text-white/30 uppercase tracking-widest font-body text-center mb-3">
                          Party of {resultOrder.people_count}
                        </p>
                        {[resultOrder.full_name, ...resultOrder.guest_names].map((name, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-display flex-shrink-0"
                              style={{ background: `${stateColor}25`, color: stateColor }}
                            >
                              {i + 1}
                            </span>
                            <span className="text-white font-body text-sm">{name}</span>
                            {i === 0 && <span className="text-white/25 text-xs font-body ml-auto">holder</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {resultMsg && (
                  <p className="text-white/40 font-body text-sm text-center mb-6">{resultMsg}</p>
                )}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={reset}
                    className="px-8 py-4 rounded-2xl font-display text-xl tracking-widest text-white"
                    style={{ background: '#E8402A' }}
                  >
                    SCAN NEXT
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-4 rounded-2xl font-display text-xl tracking-widest"
                    style={{ background: '#1a1a1a', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    DONE
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanLine { 0%,100% { top: 10%; } 50% { top: 88%; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

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
  guest_names: string | null;
};

type Stats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  revenue: number;
  spots_used: number;
};

type WaitlistEntry = {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: 'Pending',  bg: 'rgba(234,179,8,0.15)',  color: '#eab308' },
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
  const [tab, setTab] = useState<'orders' | 'waitlist'>('orders');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'checked_in'>('all');
  const [search, setSearch] = useState('');
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [showScanner, setShowScanner] = useState(false);

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

  const fetchWaitlist = useCallback(async (password: string) => {
    setWaitlistLoading(true);
    try {
      const res = await fetch('/api/waitlist', { headers: { 'x-admin-password': password } });
      if (res.ok) { const data = await res.json(); setWaitlist(data.list ?? []); }
    } finally {
      setWaitlistLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed && adminPw) fetchOrders(adminPw);
  }, [authed, adminPw, filter, fetchOrders]);

  useEffect(() => {
    if (authed && adminPw && tab === 'waitlist') fetchWaitlist(adminPw);
  }, [authed, adminPw, tab, fetchWaitlist]);

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

  async function checkInOrder(orderId: string) {
    setActionLoading(orderId + 'checkin');
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPw },
      body: JSON.stringify({ action: 'check_in' }),
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/paso-logo.png" alt="PASO" className="h-12 mx-auto mb-1" />
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
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/paso-logo.png" alt="PASO" className="h-6" />
          <span className="font-display text-sm tracking-widest text-white/40">ADMIN</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-body text-white transition-colors font-display tracking-wider"
            style={{ background: '#E8402A' }}
          >
            SCAN QR
          </button>
          <button
            onClick={() => tab === 'orders' ? fetchOrders(adminPw) : fetchWaitlist(adminPw)}
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

        {/* Top-level tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['orders', 'waitlist'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-xs font-display tracking-widest transition-all"
              style={{
                background: tab === t ? '#E8402A' : 'transparent',
                color: tab === t ? '#fff' : 'rgba(255,255,255,0.35)',
              }}
            >
              {t === 'orders' ? 'ORDERS' : `WAITLIST${waitlist.length ? ` (${waitlist.length})` : ''}`}
            </button>
          ))}
        </div>

        {tab === 'waitlist' ? (
          <div>
            {waitlistLoading ? (
              <div className="text-center py-16 text-white/20 font-display text-2xl tracking-widest">LOADING...</div>
            ) : waitlist.length === 0 ? (
              <div className="text-center py-16 text-white/20 font-display text-2xl tracking-widest">NO WAITLIST</div>
            ) : (
              <div className="space-y-2">
                {waitlist.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl p-4"
                    style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display flex-shrink-0"
                          style={{ background: 'rgba(232,64,42,0.15)', color: '#E8402A' }}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-lg text-white truncate">{entry.full_name || '—'}</p>
                          <p className="text-xs text-white/35 font-body truncate">{entry.email}</p>
                        </div>
                      </div>
                      <span className="text-xs text-white/20 font-body flex-shrink-0">
                        {new Date(entry.created_at + 'Z').toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
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

        <div className="flex gap-1 p-1 rounded-xl mb-3" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['all', 'pending', 'approved', 'rejected', 'checked_in'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 py-2 rounded-lg font-display tracking-widest transition-all"
              style={{
                fontSize: 10,
                background: filter === f ? (f === 'checked_in' ? '#22c55e' : '#E8402A') : 'transparent',
                color: filter === f ? '#fff' : 'rgba(255,255,255,0.35)',
              }}
            >
              {f === 'checked_in' ? '✓ IN' : f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 text-sm pointer-events-none">⌕</span>
          <input
            className="form-input"
            style={{ paddingLeft: '2.25rem', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-16 text-white/20 font-display text-2xl tracking-widest">LOADING...</div>
        ) : orders.filter(o => {
            const q = search.toLowerCase();
            return !q || o.full_name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q);
          }).length === 0 ? (
          <div className="text-center py-16 text-white/20 font-display text-2xl tracking-widest">{orders.length === 0 ? 'NO ORDERS' : 'NO RESULTS'}</div>
        ) : (
          <div className="space-y-2">
            {orders
              .filter(o => {
                const q = search.toLowerCase();
                return !q || o.full_name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q);
              })
              .map(order => {
              const badge = STATUS_BADGE[order.status];
              const canCheckIn = order.status === 'approved' && !order.checked_in;
              return (
                <div
                  key={order.id}
                  className="rounded-2xl p-4 transition-all hover:border-white/10"
                  style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="flex items-start justify-between gap-3"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedOrder(order)}
                  >
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
                  <div
                    className="flex items-center justify-between mt-2 pt-2"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                    onClick={() => setSelectedOrder(order)}
                  >
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
                  {canCheckIn && (
                    <button
                      onClick={e => { e.stopPropagation(); checkInOrder(order.id); }}
                      disabled={actionLoading === order.id + 'checkin'}
                      className="mt-2 w-full py-2.5 rounded-xl font-display text-sm tracking-widest text-white transition-opacity"
                      style={{ background: '#2563eb', opacity: actionLoading === order.id + 'checkin' ? 0.5 : 1 }}
                    >
                      {actionLoading === order.id + 'checkin' ? 'CHECKING IN...' : '⬤ CHECK IN'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>

      {showScanner && (
        <QRScanner
          adminPw={adminPw}
          onClose={() => { setShowScanner(false); fetchOrders(adminPw); }}
        />
      )}

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
                  { label: 'Submitted', val: new Date(selectedOrder.created_at + 'Z').toLocaleString() },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-white/30">{label}</span>
                    <span className="text-white text-right">{val}</span>
                  </div>
                ))}

                {/* Guest names */}
                {(() => {
                  let names: string[] = [];
                  try { names = JSON.parse(selectedOrder.guest_names || '[]'); } catch (_) {}
                  const all = [selectedOrder.full_name, ...names];
                  return (
                    <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-white/30 mb-2">Party ({all.length})</p>
                      <div className="space-y-1">
                        {all.map((name, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: 'rgba(232,64,42,0.15)', color: '#E8402A' }}>{i + 1}</span>
                            <span className="text-white text-sm">{name}</span>
                            {i === 0 && <span className="text-white/25 text-xs">(ticket holder)</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

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
                {selectedOrder.status === 'approved' && !selectedOrder.checked_in && (
                  <button
                    onClick={() => checkInOrder(selectedOrder.id)}
                    disabled={!!actionLoading}
                    className="w-full py-4 rounded-xl font-display text-xl tracking-widest text-white transition-opacity"
                    style={{ background: '#2563eb', opacity: actionLoading ? 0.5 : 1, boxShadow: '0 4px 24px rgba(37,99,235,0.25)' }}
                  >
                    {actionLoading === selectedOrder.id + 'checkin' ? 'CHECKING IN...' : '⬤ CHECK IN AT DOOR'}
                  </button>
                )}
                {selectedOrder.checked_in === 1 && (
                  <div className="w-full py-3 rounded-xl text-center font-display text-lg tracking-widest" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                    ✓ CHECKED IN {selectedOrder.checked_in_at ? `· ${new Date(selectedOrder.checked_in_at + 'Z').toLocaleTimeString()}` : ''}
                  </div>
                )}
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
