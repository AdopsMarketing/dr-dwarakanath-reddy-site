import type { APIRoute } from 'astro';

export const prerender = false;

interface ContactPayload {
  reason: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  message: string;
}

function isValidEmail(v: string | undefined) {
  return !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export const POST: APIRoute = async ({ request }) => {
  let body: Partial<ContactPayload> = {};

  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries()) as Partial<ContactPayload>;
    }
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid body' }), { status: 400 });
  }

  const { reason = '', date = '', time = '', name = '', phone = '', email = '', message = '' } = body;

  if (!name.trim() || !phone.trim()) {
    return new Response(JSON.stringify({ ok: false, error: 'name and phone are required' }), { status: 400 });
  }
  if (email && !isValidEmail(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid email' }), { status: 400 });
  }

  const payload: ContactPayload = { reason, date, time, name, phone, email, message };

  const resendKey = import.meta.env.RESEND_API_KEY;
  const to = import.meta.env.CONTACT_EMAIL ?? 'dwarak858@gmail.com';

  console.log('[contact] request received:', payload);

  if (resendKey) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const subject = `New consultation request · ${payload.name}`;
      const text = [
        `Reason: ${payload.reason || 'not specified'}`,
        `Preferred date: ${payload.date || 'not specified'}`,
        `Time of day: ${payload.time || 'not specified'}`,
        '',
        `Name: ${payload.name}`,
        `Phone: ${payload.phone}`,
        `Email: ${payload.email || 'not provided'}`,
        '',
        'Message:',
        payload.message || '(no message)',
      ].join('\n');
      await resend.emails.send({
        from: 'Dr. Reddy Website <noreply@gastrosurgeonnellore.com>',
        to,
        subject,
        text,
      });
    } catch (err) {
      console.error('[contact] resend send failed:', err);
    }
  } else {
    console.warn('[contact] RESEND_API_KEY not set. Payload logged only.');
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
