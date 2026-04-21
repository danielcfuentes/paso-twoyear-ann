import nodemailer from 'nodemailer';

function getSiteUrl() {
  // SITE_URL takes priority (set this in Railway to your domain)
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  // Railway injects RAILWAY_PUBLIC_DOMAIN automatically
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return 'http://localhost:3000';
}

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const base = (content: string) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#000;color:#fff;border-radius:16px;overflow:hidden;border:1px solid #1a1a1a;">
  <div style="background:#E8402A;padding:24px 32px;">
    <p style="margin:0;font-size:32px;font-weight:900;letter-spacing:4px;color:#fff;">PASO</p>
    <p style="margin:4px 0 0;font-size:11px;letter-spacing:3px;color:rgba(255,255,255,0.7);">RUN CLUB</p>
  </div>
  <div style="padding:32px;">${content}</div>
  <div style="padding:16px 32px;border-top:1px solid #111;text-align:center;">
    <a href="https://www.instagram.com/pasorunclub/" style="color:#E8402A;text-decoration:none;font-size:12px;letter-spacing:2px;">@PASORUNCLUB</a>
  </div>
</div>`;

const btn = (url: string, label: string) =>
  `<a href="${url}" style="display:inline-block;background:#E8402A;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;margin-top:24px;">${label}</a>`;

// Sent immediately when an order is submitted (before review)
export async function sendSubmissionEmail(order: {
  full_name: string;
  email: string;
  ticket_count: number;
  amount_due: number;
  id: string;
}) {
  const transporter = getTransporter();
  if (!transporter) return;
  const statusUrl = `${getSiteUrl()}/confirmation/${order.id}`;
  await transporter.sendMail({
    from: process.env.FROM_EMAIL || `"PASO Run Club" <${process.env.SMTP_USER}>`,
    to: order.email,
    subject: 'We got your order — PASO 2 Year Anniversary',
    html: base(`
      <h2 style="margin:0 0 8px;font-size:22px;">Hey ${order.full_name},</h2>
      <p style="color:#aaa;margin:0 0 24px;">We received your ticket request and are reviewing your payment. You'll hear back within <strong style="color:#fff;">24 hours</strong>.</p>
      <div style="background:#111;border-radius:12px;padding:20px;margin-bottom:8px;">
        <p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;color:#555;">ORDER SUMMARY</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="color:#888;padding:4px 0;">Tickets</td><td style="text-align:right;color:#fff;">${order.ticket_count}× General Admission</td></tr>
          <tr><td style="color:#888;padding:4px 0;">Total paid</td><td style="text-align:right;color:#E8402A;font-weight:700;font-size:18px;">$${order.amount_due}</td></tr>
          <tr><td style="color:#888;padding:4px 0;">Order ID</td><td style="text-align:right;color:#555;font-size:12px;">${order.id.slice(0,8).toUpperCase()}</td></tr>
        </table>
      </div>
      <p style="color:#555;font-size:13px;">Bookmark this link — you can check your status anytime:</p>
      ${btn(statusUrl, 'CHECK ORDER STATUS →')}
    `),
  });
}

// Sent when admin approves — includes ticket link
export async function sendConfirmationEmail(order: {
  full_name: string;
  email: string;
  ticket_type: string;
  ticket_count: number;
  amount_due: number;
  id: string;
}) {
  const transporter = getTransporter();
  if (!transporter) return;
  const ticketUrl = `${getSiteUrl()}/ticket/${order.id}`;
  await transporter.sendMail({
    from: process.env.FROM_EMAIL || `"PASO Run Club" <${process.env.SMTP_USER}>`,
    to: order.email,
    subject: '✅ Ticket confirmed — PASO 2 Year Anniversary',
    html: base(`
      <h2 style="margin:0 0 8px;font-size:22px;">You&apos;re confirmed, ${order.full_name}!</h2>
      <p style="color:#aaa;margin:0 0 24px;">Your payment was verified. Show your QR code at the door.</p>
      <div style="background:#111;border:1px solid rgba(232,64,42,0.3);border-radius:12px;padding:20px;margin-bottom:8px;">
        <p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;color:#555;">EVENT DETAILS</p>
        <p style="margin:6px 0;font-size:14px;">📅 <strong>Tuesday, April 28</strong></p>
        <p style="margin:6px 0;font-size:14px;">🕖 <strong>7:00 PM</strong></p>
        <p style="margin:6px 0;font-size:14px;">📍 <strong>Panorama Restaurant</strong></p>
        <p style="margin:2px 0 0 24px;color:#666;font-size:13px;">8710 Astoria Blvd, Flushing NY 11369</p>
      </div>
      <div style="background:#111;border-radius:12px;padding:20px;margin-top:8px;">
        <p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;color:#555;">YOUR TICKETS</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="color:#888;padding:4px 0;">Type</td><td style="text-align:right;color:#fff;">${order.ticket_type}</td></tr>
          <tr><td style="color:#888;padding:4px 0;">Quantity</td><td style="text-align:right;color:#fff;">${order.ticket_count}</td></tr>
          <tr><td style="color:#888;padding:4px 0;">Total</td><td style="text-align:right;color:#E8402A;font-weight:700;font-size:18px;">$${order.amount_due}</td></tr>
        </table>
      </div>
      ${btn(ticketUrl, 'VIEW TICKET & QR CODE →')}
    `),
  });
}

// Sent when admin rejects
export async function sendRejectionEmail(order: { full_name: string; email: string }) {
  const transporter = getTransporter();
  if (!transporter) return;
  await transporter.sendMail({
    from: process.env.FROM_EMAIL || `"PASO Run Club" <${process.env.SMTP_USER}>`,
    to: order.email,
    subject: 'Regarding your ticket request — PASO 2 Year Anniversary',
    html: base(`
      <h2 style="margin:0 0 16px;">Hey ${order.full_name},</h2>
      <p style="color:#aaa;">We weren&apos;t able to verify your payment for the 2 Year Anniversary Celebration Dinner.</p>
      <p style="color:#aaa;">This could be due to an unclear screenshot or a payment we couldn&apos;t locate.</p>
      <p style="color:#aaa;margin-top:16px;">Please DM us on Instagram and we&apos;ll sort it out:</p>
      <a href="https://www.instagram.com/pasorunclub/" style="display:inline-block;margin-top:16px;color:#E8402A;font-weight:700;font-size:16px;letter-spacing:1px;text-decoration:none;">→ @pasorunclub</a>
    `),
  });
}

export async function sendWaitlistConfirmEmail(email: string, name: string) {
  const transporter = getTransporter();
  if (!transporter) return;
  await transporter.sendMail({
    from: process.env.FROM_EMAIL || `"PASO Run Club" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "You're on the waitlist — PASO 2 Year Anniversary",
    html: base(`
      <h2 style="margin:0 0 16px;">You&apos;re on the list${name ? ', ' + name : ''}!</h2>
      <p style="color:#aaa;">We&apos;ll email you as soon as a spot opens up for the PASO 2 Year Anniversary Celebration Dinner.</p>
      <p style="color:#aaa;margin-top:12px;">Follow us for updates:</p>
      <a href="https://www.instagram.com/pasorunclub/" style="display:inline-block;margin-top:12px;color:#E8402A;font-weight:700;letter-spacing:1px;text-decoration:none;">→ @pasorunclub</a>
    `),
  });
}
