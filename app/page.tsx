'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TICKET_PRICE } from '@/lib/tickets';

// ─── Countdown hook ────────────────────────────────────────────────────────
const EVENT_DATE = new Date('2026-04-28T19:00:00-04:00');

function useCountdown() {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0, past: false });
  useEffect(() => {
    function tick() {
      const diff = EVENT_DATE.getTime() - Date.now();
      if (diff <= 0) { setT({ d: 0, h: 0, m: 0, s: 0, past: true }); return; }
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        past: false,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// ─── Scroll reveal hook ────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Fireworks hook ───────────────────────────────────────────────────────
function useFireworks() {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; color: string; size: number };
    const particles: Particle[] = [];
    const COLORS = ['#E8402A', '#ff6b50', '#ff9980', '#ffffff', '#ffcc00', '#ff4d00'];

    function burst(x: number, y: number) {
      const count = 60 + Math.floor(Math.random() * 40);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const speed = 3 + Math.random() * 6;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 2 + Math.random() * 3,
        });
      }
    }

    const burstPositions = [
      [0.2, 0.25], [0.5, 0.15], [0.8, 0.25],
      [0.35, 0.45], [0.65, 0.35], [0.15, 0.5],
      [0.85, 0.45], [0.5, 0.55],
    ];
    let burstIdx = 0;
    let lastBurst = 0;

    let raf: number;
    function animate(now: number) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (burstIdx < burstPositions.length && now - lastBurst > 180) {
        const [rx, ry] = burstPositions[burstIdx];
        burst(canvas.width * rx, canvas.height * ry);
        burstIdx++;
        lastBurst = now;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.vx *= 0.98;
        p.alpha -= 0.016;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (particles.length > 0 || burstIdx < burstPositions.length) {
        raf = requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.remove();
    };
  }, []);
}

// ─── Countdown digit ──────────────────────────────────────────────────────
function CountDigit({ value, label }: { value: number; label: string }) {
  const prev = useRef(value);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (prev.current !== value) { setKey((k) => k + 1); prev.current = value; }
  }, [value]);
  const display = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex items-center justify-center rounded-xl font-display text-4xl sm:text-5xl text-white"
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', minWidth: 64, height: 72, padding: '0 12px' }}
      >
        <span key={key} className="digit-flip">{display}</span>
      </div>
      <span className="text-xs text-white/40 mt-1.5 tracking-widest uppercase font-body">{label}</span>
    </div>
  );
}

type Step = 'landing' | 1 | 2 | 3 | 'done';

interface FormState {
  full_name: string;
  email: string;
  phone: string;
  instagram: string;
  ticket_count: number;
  guest_names: string[];
}

export default function HomePage() {
  const [step, setStep] = useState<Step>('landing');
  const [form, setForm] = useState<FormState>({
    full_name: '', email: '', phone: '', instagram: '', ticket_count: 1, guest_names: [],
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);
  const [zelleInfo, setZelleInfo] = useState({ name: 'PASO Run Club', email: '—' });
  const [soldOut, setSoldOut] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistDone, setWaitlistDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const countdown = useCountdown();
  useScrollReveal();
  useFireworks();

  const amountDue = TICKET_PRICE * form.ticket_count;

  useEffect(() => {
    fetch('/api/spots').then(r => r.json()).then(d => {
      setSpotsLeft(d.spotsLeft);
      if (d.spotsLeft <= 0) setSoldOut(true);
    }).catch(() => {});
    fetch('/api/zelle').then(r => r.json()).then(d => setZelleInfo(d)).catch(() => {});
  }, []);

  useEffect(() => { topRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [step]);

  function handleFileChange(file: File | null) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) { setError('Please upload JPG, PNG, or PDF.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File too large. Max 10MB.'); return; }
    setError(''); setProofFile(file);
    if (ext !== 'pdf') {
      const reader = new FileReader();
      reader.onload = e => setProofPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else { setProofPreview(null); }
  }

  function validateStep1() {
    if (!form.full_name.trim()) return 'Full name is required.';
    if (!form.email.trim() || !form.email.includes('@')) return 'Valid email required.';
    if (form.phone.replace(/\D/g, '').length < 10) return 'Valid phone number required.';
    for (let i = 0; i < form.ticket_count - 1; i++) {
      if (!form.guest_names[i]?.trim()) return `Please enter a name for Guest ${i + 2}.`;
    }
    return '';
  }

  const handleSubmit = useCallback(async () => {
    if (!proofFile) { setError('Upload your payment screenshot to continue.'); return; }
    setSubmitting(true); setError('');
    const fd = new FormData();
    fd.append('full_name', form.full_name);
    fd.append('email', form.email);
    fd.append('phone', form.phone);
    fd.append('instagram', form.instagram);
    fd.append('ticket_type', 'general');
    fd.append('ticket_count', String(form.ticket_count));
    fd.append('guest_names', JSON.stringify(form.guest_names.filter(n => n.trim())));
    fd.append('proof', proofFile);
    try {
      const res = await fetch('/api/orders', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setOrderId(data.id); setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally { setSubmitting(false); }
  }, [proofFile, form]);

  // ─── LANDING ─────────────────────────────────────────────────────────────
  if (step === 'landing') {
    return (
      <main className="min-h-screen bg-black text-white overflow-x-hidden">

        {/* ── Sticky Nav ─────────────────────────────────────────────── */}
        <nav
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/paso-logo.png" alt="PASO" className="h-8" />
          <a
            href="https://www.instagram.com/pasorunclub/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            @pasorunclub
          </a>
        </nav>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section
          className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden"
        >
          {/* Background glow blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="hero-blob absolute"
              style={{
                width: 500, height: 500, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(232,64,42,0.25) 0%, transparent 65%)',
                top: '10%', left: '50%', transform: 'translateX(-50%)',
              }}
            />
            <div
              className="hero-blob absolute"
              style={{
                width: 300, height: 300, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(232,64,42,0.12) 0%, transparent 65%)',
                bottom: '20%', right: '-50px',
                animationDelay: '3s',
              }}
            />
          </div>

          {/* Badge */}
          <div
            className="anim-sub inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs tracking-widest uppercase font-body"
            style={{ background: 'rgba(232,64,42,0.12)', border: '1px solid rgba(232,64,42,0.3)', color: '#E8402A' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8402A]" />
            2 Year Anniversary
          </div>

          {/* PASO */}
          <div className="anim-paso relative mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/paso-logo.png"
              alt="PASO"
              className="mx-auto select-none"
              style={{ width: 'clamp(200px, 55vw, 420px)', filter: 'brightness(0) saturate(100%) invert(37%) sepia(89%) saturate(600%) hue-rotate(340deg) brightness(95%)' }}
            />
            {/* Glow under text */}
            <div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(232,64,42,0.4) 0%, transparent 70%)', filter: 'blur(8px)' }}
            />
          </div>

          {/* Subtitle */}
          <div className="anim-sub">
            <p
              className="font-display text-white tracking-[0.25em] mb-1"
              style={{ fontSize: 'clamp(18px, 5vw, 32px)' }}
            >
              RUN CLUB
            </p>
            <div className="line-slide h-0.5 bg-[#E8402A] mx-auto mb-4" />
            <p
              className="font-display text-white/60 tracking-[0.4em]"
              style={{ fontSize: 'clamp(11px, 3vw, 14px)' }}
            >
              CELEBRATION DINNER
            </p>
          </div>

          {/* Countdown */}
          {!countdown.past && (
            <div className="anim-count mt-8 mb-6">
              <p className="text-xs text-white/30 uppercase tracking-widest mb-3 font-body">
                Event starts in
              </p>
              <div className="flex items-start gap-3">
                <CountDigit value={countdown.d} label="Days" />
                <span className="font-display text-4xl text-white/20 mt-3">:</span>
                <CountDigit value={countdown.h} label="Hrs" />
                <span className="font-display text-4xl text-white/20 mt-3">:</span>
                <CountDigit value={countdown.m} label="Min" />
                <span className="font-display text-4xl text-white/20 mt-3">:</span>
                <CountDigit value={countdown.s} label="Sec" />
              </div>
            </div>
          )}
          {countdown.past && <div className="mt-8 mb-6" />}

          {/* Event info pills */}
          <div className="anim-info flex flex-wrap justify-center gap-2 mb-6">
            {[
              { icon: '📅', text: 'Tuesday, April 28' },
              { icon: '🕖', text: 'Doors 7:00 PM' },
              { icon: '📍', text: 'Panorama · Flushing' },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-body"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="text-sm">{item.icon}</span>
                <span className="text-white/70">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Spots badge */}
          {spotsLeft !== null && spotsLeft > 0 && (
            <div
              className="anim-spots spots-badge inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 font-body text-sm font-semibold"
              style={{
                background: spotsLeft <= 20 ? 'rgba(232,64,42,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${spotsLeft <= 20 ? 'rgba(232,64,42,0.5)' : 'rgba(255,255,255,0.12)'}`,
                color: spotsLeft <= 20 ? '#E8402A' : 'rgba(255,255,255,0.7)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: spotsLeft <= 20 ? '#E8402A' : '#fff' }}
              />
              {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} remaining
            </div>
          )}
          {spotsLeft === 0 && (
            <div
              className="anim-spots inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 font-body text-sm font-semibold"
              style={{ background: 'rgba(232,64,42,0.15)', border: '1px solid rgba(232,64,42,0.4)', color: '#E8402A' }}
            >
              🔴 Sold Out
            </div>
          )}

        </section>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div className="px-6 py-4">
          <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(232,64,42,0.5),transparent)' }} />
        </div>

        {/* ── About ───────────────────────────────────────────────────── */}
        <section className="px-6 py-16 max-w-lg mx-auto reveal">
          <p className="font-display text-[#E8402A] text-sm tracking-[0.4em] mb-3">THE EVENT</p>
          <h2 className="font-display text-white leading-none mb-6" style={{ fontSize: 'clamp(36px,10vw,60px)' }}>
            LEAVE YOUR<br />
            <span style={{ color: '#E8402A' }}>RUNNING</span><br />
            SHOES HOME
          </h2>
          <p className="text-white/60 leading-relaxed font-body text-base">
            Two years of miles, sweat, and community. Now it&apos;s time to celebrate the way we know
            best — together. This is a night to eat, dance, connect, and appreciate
            everything PASO has become.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-8">
            {[
              { icon: '🍽️', label: 'EAT' },
              { icon: '💃', label: 'DANCE' },
              { icon: '🤝', label: 'CONNECT' },
              { icon: '🥂', label: 'CELEBRATE' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-display text-lg tracking-widest text-white">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── What's Included ─────────────────────────────────────────── */}
        <section className="px-6 py-12 max-w-lg mx-auto">
          <div className="reveal">
            <p className="font-display text-[#E8402A] text-sm tracking-[0.4em] mb-3">INCLUDED</p>
            <h2 className="font-display text-white leading-none mb-8" style={{ fontSize: 'clamp(32px,9vw,52px)' }}>
              WHAT YOU GET
            </h2>
          </div>
          <div className="space-y-3">
            {[
              { icon: '🍛', title: 'Full Buffet', desc: 'Provided by Panorama Restaurant', delay: 'reveal-delay-1' },
              { icon: '🥤', title: 'Unlimited Drinks', desc: 'Non-alcoholic, all night', delay: 'reveal-delay-2' },
              { icon: '🍷', title: 'Bar Available', desc: 'Alcohol for purchase', delay: 'reveal-delay-3' },
              { icon: '🎵', title: 'Live Music', desc: 'Dance-ready all night', delay: 'reveal-delay-1' },
              { icon: '🎉', title: 'Dance Floor', desc: 'Space to move and celebrate', delay: 'reveal-delay-2' },
            ].map((item) => (
              <div
                key={item.title}
                className={`reveal ${item.delay} flex items-center gap-4 p-4 rounded-2xl group transition-colors`}
                style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: 'rgba(232,64,42,0.1)', border: '1px solid rgba(232,64,42,0.2)' }}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="font-display text-lg tracking-wide text-white">{item.title}</p>
                  <p className="text-white/40 text-sm font-body">{item.desc}</p>
                </div>
                <div className="ml-auto w-1 h-8 rounded-full flex-shrink-0" style={{ background: '#E8402A' }} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Location ────────────────────────────────────────────────── */}
        <section className="px-6 py-12 max-w-lg mx-auto reveal">
          <p className="font-display text-[#E8402A] text-sm tracking-[0.4em] mb-3">VENUE</p>
          <div
            className="p-6 rounded-3xl"
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="font-display text-3xl text-white mb-1">PANORAMA</p>
            <p className="font-display text-[#E8402A] text-xl mb-4">RESTAURANT</p>
            <p className="text-white/50 font-body text-sm mb-4">
              8710 Astoria Blvd<br />Flushing, New York 11369
            </p>
            <a
              href="https://maps.google.com/?q=8710+Astoria+Blvd+Flushing+NY+11369"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-display tracking-widest text-sm transition-opacity hover:opacity-70"
              style={{ color: '#E8402A' }}
            >
              GET DIRECTIONS →
            </a>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="px-6 pt-12 pb-32 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/paso-logo.png" alt="PASO" className="h-8 mx-auto mb-3 opacity-10" />
          <a
            href="https://www.instagram.com/pasorunclub/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/30 text-xs font-body hover:text-white/60 transition-colors block mb-3"
          >
            @pasorunclub
          </a>
        </footer>

        {/* ── Sticky bottom CTA ───────────────────────────────────────── */}
        <div
          className="fixed bottom-0 left-0 right-0 p-4 no-print"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.97) 40%)', backdropFilter: 'blur(1px)' }}
        >
          <div className="max-w-sm mx-auto">
            {soldOut ? (
              !waitlistDone ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input className="form-input text-sm py-3" placeholder="Name" value={waitlistName} onChange={e => setWaitlistName(e.target.value)} />
                    <input type="email" className="form-input text-sm py-3" placeholder="Email" value={waitlistEmail} onChange={e => setWaitlistEmail(e.target.value)} />
                  </div>
                  <button
                    onClick={async () => {
                      await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: waitlistEmail, full_name: waitlistName }) });
                      setWaitlistDone(true);
                    }}
                    className="btn-glow w-full py-4 rounded-2xl font-display text-xl tracking-widest"
                  >
                    JOIN WAITLIST
                  </button>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-[#E8402A] font-display text-2xl tracking-wider">YOU&apos;RE ON THE LIST ✓</p>
                  <p className="text-white/40 text-xs font-body mt-1">We&apos;ll hit you up if a spot opens.</p>
                </div>
              )
            ) : (
              <>
                <button
                  onClick={() => setStep(1)}
                  className="btn-glow w-full py-4 rounded-2xl font-display text-xl tracking-widest"
                >
                  GET TICKET — $40
                </button>
                <a
                  href="/lookup"
                  className="block text-center text-white/50 text-xs font-body mt-2.5 hover:text-white transition-colors"
                >
                  Already bought a ticket? <span className="underline" style={{ color: '#E8402A' }}>Find your order →</span>
                </a>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ─── CHECKOUT WRAPPER ──────────────────────────────────────────────────────
  return (
    <div ref={topRef} className="min-h-screen bg-black text-white">
      {/* Checkout nav */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-5 py-4"
        style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {step !== 'done' ? (
          <button
            onClick={() => {
              if (step === 1) setStep('landing');
              else if (step === 2) setStep(1);
              else if (step === 3) setStep(2);
            }}
            className="text-white/40 hover:text-white transition-colors text-sm font-body flex items-center gap-1"
          >
            ← Back
          </button>
        ) : (
          <button onClick={() => setStep('landing')} className="text-white/40 hover:text-white transition-colors text-sm font-body">
            ← Home
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/paso-logo.png" alt="PASO" className="h-7" />

        {/* Step indicator */}
        {step !== 'done' ? (
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className="h-1 rounded-full transition-all duration-300"
                style={{ width: s <= (step as number) ? 24 : 8, background: s <= (step as number) ? '#E8402A' : 'rgba(255,255,255,0.12)' }}
              />
            ))}
          </div>
        ) : <div className="w-16" />}
      </div>

      <div className="px-5 py-8 max-w-md mx-auto step-enter">

        {/* ── STEP 1 ────────────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <p className="text-white/30 text-xs font-body uppercase tracking-widest mb-1">Step 1 of 3</p>
            <h2 className="font-display text-4xl text-white mb-8">YOUR INFO</h2>

            <div className="space-y-4">
              {[
                { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Jane Smith', required: true },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'jane@email.com', required: true },
                { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '(718) 555-0100', required: true },
              ].map(({ label, key, type, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-2 font-body">
                    {label} {required && <span style={{ color: '#E8402A' }}>*</span>}
                  </label>
                  <input
                    type={type}
                    className="form-input"
                    placeholder={placeholder}
                    value={form[key as keyof FormState] as string}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-white/40 uppercase tracking-widest mb-2 font-body">
                  Instagram <span className="text-white/20 normal-case tracking-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg pointer-events-none">@</span>
                  <input
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    placeholder="yourhandle"
                    value={form.instagram}
                    onChange={e => setForm(prev => ({ ...prev, instagram: e.target.value }))}
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-widest mb-3 font-body">
                  Number of Tickets <span style={{ color: '#E8402A' }}>*</span>
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setForm(p => {
                      const count = Math.max(1, p.ticket_count - 1);
                      return { ...p, ticket_count: count, guest_names: p.guest_names.slice(0, count - 1) };
                    })}
                    className="w-14 h-14 rounded-xl text-2xl text-white flex items-center justify-center transition-colors"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <span className="font-display text-5xl" style={{ color: '#E8402A' }}>{form.ticket_count}</span>
                    <p className="text-white/20 text-xs font-body mt-1">max 4</p>
                  </div>
                  <button
                    onClick={() => setForm(p => {
                      const count = Math.min(4, p.ticket_count + 1);
                      const guests = [...p.guest_names];
                      while (guests.length < count - 1) guests.push('');
                      return { ...p, ticket_count: count, guest_names: guests };
                    })}
                    className="w-14 h-14 rounded-xl text-2xl text-white flex items-center justify-center transition-colors"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Guest names for extra tickets */}
              {form.ticket_count > 1 && (
                <div className="space-y-3">
                  <label className="block text-xs text-white/40 uppercase tracking-widest font-body">
                    Guest Names <span style={{ color: '#E8402A' }}>*</span>
                  </label>
                  {Array.from({ length: form.ticket_count - 1 }).map((_, i) => (
                    <div key={i}>
                      <input
                        className="form-input"
                        placeholder={`Guest ${i + 2} full name`}
                        value={form.guest_names[i] ?? ''}
                        onChange={e => setForm(p => {
                          const names = [...p.guest_names];
                          names[i] = e.target.value;
                          return { ...p, guest_names: names };
                        })}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              <div
                className="flex items-center justify-between p-5 rounded-2xl"
                style={{ background: 'rgba(232,64,42,0.08)', border: '1px solid rgba(232,64,42,0.25)' }}
              >
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5 font-body">Total Due</p>
                  <p className="text-white/60 text-sm font-body">{form.ticket_count} × $40</p>
                </div>
                <span className="font-display text-4xl" style={{ color: '#E8402A' }}>${amountDue}</span>
              </div>

              {error && (
                <div className="p-4 rounded-xl text-sm font-body" style={{ background: 'rgba(232,64,42,0.1)', color: '#ff6b6b', border: '1px solid rgba(232,64,42,0.3)' }}>
                  {error}
                </div>
              )}

              <button
                onClick={() => { const e = validateStep1(); if (e) { setError(e); return; } setError(''); setStep(2); }}
                className="btn-glow w-full py-5 rounded-2xl font-display text-2xl tracking-widest mt-2"
              >
                CONTINUE →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ────────────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <p className="text-white/30 text-xs font-body uppercase tracking-widest mb-1">Step 2 of 3</p>
            <h2 className="font-display text-4xl text-white mb-8">SEND PAYMENT</h2>

            {/* Amount */}
            <div
              className="rounded-3xl p-6 text-center mb-6"
              style={{ background: 'rgba(232,64,42,0.08)', border: '1.5px solid rgba(232,64,42,0.35)' }}
            >
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2 font-body">Amount Due</p>
              <p className="font-display leading-none mb-2" style={{ fontSize: 80, color: '#E8402A' }}>${amountDue}</p>
              <p className="text-white/40 text-sm font-body">{form.ticket_count} ticket{form.ticket_count !== 1 ? 's' : ''} · General Admission</p>
            </div>

            {/* Zelle info */}
            <div className="rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-4" style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-1 font-body">Send Zelle To</p>
                <p className="font-display text-2xl text-white tracking-wider">{zelleInfo.name}</p>
              </div>
              <div className="px-5 py-4" style={{ background: '#0a0a0a' }}>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-1 font-body">Email</p>
                <p className="font-display text-2xl text-white tracking-wider">{zelleInfo.email}</p>
              </div>
            </div>

            {/* Steps */}
            <div className="rounded-2xl p-5 mb-6 space-y-3" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                `Open your bank app → Zelle`,
                `Send exactly $${amountDue} to the info above`,
                `Put your name in the Zelle memo`,
                `Screenshot the confirmation screen`,
                `Upload it on the next screen`,
              ].map((s, i) => (
                <div key={i} className="flex gap-3 items-start text-sm text-white/50 font-body">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(232,64,42,0.2)', color: '#E8402A' }}
                  >{i + 1}</span>
                  {s}
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(3)}
              className="btn-glow w-full py-5 rounded-2xl font-display text-2xl tracking-widest"
            >
              I SENT IT →
            </button>
          </div>
        )}

        {/* ── STEP 3 ────────────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <p className="text-white/30 text-xs font-body uppercase tracking-widest mb-1">Step 3 of 3</p>
            <h2 className="font-display text-4xl text-white mb-2">UPLOAD PROOF</h2>
            <p className="text-white/40 text-sm font-body mb-6">Upload a screenshot of your Zelle confirmation</p>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[
                { label: 'Name', val: form.full_name },
                { label: 'Tickets', val: String(form.ticket_count) },
                { label: 'Total', val: `$${amountDue}` },
              ].map(({ label, val }) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-white/30 uppercase tracking-widest mb-1 font-body">{label}</p>
                  <p className="font-display text-lg" style={{ color: label === 'Total' ? '#E8402A' : '#fff' }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Drop zone */}
            <div
              className={`drop-zone rounded-3xl p-8 text-center cursor-pointer mb-6 ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files[0] ?? null); }}
            >
              <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
              {proofFile ? (
                <div>
                  {proofPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proofPreview} alt="proof" className="max-h-52 mx-auto rounded-2xl mb-4 object-contain" />
                  ) : (
                    <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 text-3xl" style={{ background: 'rgba(232,64,42,0.1)' }}>📄</div>
                  )}
                  <p className="font-display text-xl tracking-wider" style={{ color: '#E8402A' }}>{proofFile.name}</p>
                  <p className="text-white/30 text-xs mt-1 font-body">Tap to change</p>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 text-3xl" style={{ background: '#111' }}>📸</div>
                  <p className="font-display text-xl tracking-wide text-white mb-1">TAP TO UPLOAD</p>
                  <p className="text-white/30 text-xs font-body">JPG · PNG · PDF · Max 10MB</p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-xl text-sm mb-4 font-body" style={{ background: 'rgba(232,64,42,0.1)', color: '#ff6b6b', border: '1px solid rgba(232,64,42,0.3)' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !proofFile}
              className="btn-glow w-full py-5 rounded-2xl font-display text-2xl tracking-widest"
              style={{ opacity: !proofFile || submitting ? 0.4 : 1, cursor: !proofFile || submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'SUBMITTING...' : 'SUBMIT ORDER →'}
            </button>
            <p className="text-center text-white/20 text-xs mt-4 font-body">Reviewed within 24 hours</p>
          </div>
        )}

        {/* ── DONE ──────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="text-center py-6">
            {/* Check icon */}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(232,64,42,0.12)', border: '2px solid rgba(232,64,42,0.4)' }}
            >
              <span className="font-display text-5xl" style={{ color: '#E8402A' }}>✓</span>
            </div>

            <h2 className="font-display text-5xl text-white mb-2">ORDER IN!</h2>
            <p className="font-display text-2xl mb-6" style={{ color: '#E8402A' }}>WE GOT YOU</p>

            <p className="text-white/50 font-body text-sm leading-relaxed mb-8 max-w-xs mx-auto">
              Your ticket request is under review. We&apos;ll confirm your payment within{' '}
              <strong className="text-white">24 hours</strong> and send you a QR code.
            </p>

            <div
              className="rounded-2xl p-5 text-left mb-6"
              style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-xs text-white/30 uppercase tracking-widest mb-4 font-body">Confirmation</p>
              <div className="space-y-3 text-sm font-body">
                {[
                  { label: 'Name', val: form.full_name },
                  { label: 'Email', val: form.email },
                  { label: 'Tickets', val: `${form.ticket_count}× General Admission` },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white font-medium text-right">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-white/40">Total</span>
                  <span className="font-display text-xl" style={{ color: '#E8402A' }}>${amountDue}</span>
                </div>
              </div>
            </div>

            <a
              href={`/confirmation/${orderId}`}
              className="block w-full py-4 rounded-2xl font-display text-xl tracking-widest text-center"
              style={{ background: 'rgba(232,64,42,0.12)', border: '1px solid rgba(232,64,42,0.3)', color: '#E8402A' }}
            >
              CHECK ORDER STATUS
            </a>
            <p className="text-white/15 text-xs mt-6 font-body">
              Lost this page?{' '}
              <a href="/lookup" className="underline" style={{ color: 'rgba(232,64,42,0.5)' }}>
                Find your order by email
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
