'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

type VerifyResult = {
  valid: boolean;
  reason?: string;
  alreadyUsed?: boolean;
  checked_in_at?: string;
  order?: {
    full_name: string;
    instagram?: string;
    ticket_type: string;
    ticket_count: number;
    people_count: number;
  };
  message?: string;
};

function ScanContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const adminPw = searchParams.get('pw') ?? '';

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInError, setCheckInError] = useState('');

  useEffect(() => {
    fetch(`/api/verify/${params.id}`)
      .then(r => r.json())
      .then(d => { setResult(d); setLoading(false); })
      .catch(() => {
        setResult({ valid: false, reason: 'ERROR', message: 'Failed to verify ticket.' });
        setLoading(false);
      });
  }, [params.id]);

  async function handleCheckIn() {
    setCheckingIn(true); setCheckInError('');
    try {
      const res = await fetch(`/api/verify/${params.id}`, {
        method: 'POST',
        headers: { 'x-admin-password': adminPw },
      });
      if (res.ok) {
        setCheckedIn(true);
        setResult(prev => prev ? { ...prev, valid: false, alreadyUsed: true } : prev);
      } else {
        const d = await res.json();
        setCheckInError(d.error || 'Check-in failed.');
      }
    } catch {
      setCheckInError('Network error.');
    } finally {
      setCheckingIn(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="font-display text-2xl tracking-widest text-white/30 animate-pulse">VERIFYING...</p>
      </div>
    );
  }

  const isValid = result?.valid && !checkedIn;
  const isAlreadyUsed = result?.alreadyUsed || checkedIn;

  // Colors based on state
  const stateColor = isAlreadyUsed ? '#f59e0b' : isValid ? '#22c55e' : '#ef4444';
  const stateBg = isAlreadyUsed ? 'rgba(245,158,11,0.08)' : isValid ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';
  const stateBorder = isAlreadyUsed ? 'rgba(245,158,11,0.3)' : isValid ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
  const stateIcon = isAlreadyUsed ? '⚠' : isValid ? '✓' : '✗';
  const stateHeadline = checkedIn ? 'CHECKED IN!' : isAlreadyUsed ? 'ALREADY USED' : isValid ? 'VALID TICKET' : 'INVALID';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-white"
      style={{ background: '#000' }}
    >
      {/* Big status icon */}
      <div
        className="w-32 h-32 rounded-full flex items-center justify-center mb-6"
        style={{
          background: stateBg,
          border: `3px solid ${stateBorder}`,
          boxShadow: `0 0 60px ${stateColor}30`,
        }}
      >
        <span className="font-display text-6xl" style={{ color: stateColor }}>{stateIcon}</span>
      </div>

      <h1 className="font-display text-5xl mb-2 text-center" style={{ color: stateColor }}>
        {stateHeadline}
      </h1>

      {/* Guest info */}
      {result?.order && (
        <div
          className="w-full max-w-xs rounded-2xl p-5 mt-6"
          style={{ background: '#0d0d0d', border: `1px solid ${stateBorder}` }}
        >
          <p className="font-display text-2xl text-white text-center mb-0.5">{result.order.full_name}</p>
          {result.order.instagram && (
            <p className="text-white/40 font-body text-sm text-center mb-4">@{result.order.instagram}</p>
          )}
          <div className="space-y-2 text-sm font-body pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between">
              <span className="text-white/40">Ticket</span>
              <span className="text-white">{result.order.ticket_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Guests admitted</span>
              <span className="font-display text-xl" style={{ color: stateColor }}>
                {result.order.people_count}
              </span>
            </div>
          </div>
        </div>
      )}

      {!result?.order && result?.message && (
        <p className="text-white/40 font-body text-sm text-center mt-4 max-w-xs">{result.message}</p>
      )}

      {isAlreadyUsed && result?.checked_in_at && !checkedIn && (
        <p className="text-white/30 text-xs font-body mt-3">
          Checked in at {new Date(result.checked_in_at + 'Z').toLocaleTimeString()}
        </p>
      )}

      {/* Check-in button for admins */}
      {adminPw && isValid && !checkedIn && (
        <div className="mt-8 w-full max-w-xs">
          {checkInError && <p className="text-red-400 text-sm text-center mb-3 font-body">{checkInError}</p>}
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="w-full py-5 rounded-2xl font-display text-2xl tracking-widest text-white"
            style={{ background: '#22c55e', opacity: checkingIn ? 0.6 : 1, boxShadow: '0 4px 32px rgba(34,197,94,0.3)' }}
          >
            {checkingIn ? 'CHECKING IN...' : '✓ CHECK IN GUEST'}
          </button>
        </div>
      )}

      {checkedIn && (
        <div
          className="mt-6 px-6 py-4 rounded-xl text-center"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          <p className="font-display text-2xl text-green-400">WELCOME IN!</p>
        </div>
      )}

      <p className="text-white/15 text-xs font-body mt-12">PASO Run Club · 2 Year Anniversary</p>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="font-display text-2xl tracking-widest text-white/30">LOADING...</p>
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}
