import escapeHtml from '../../lib/escapeHtml'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Server-side size caps — the DB and the notification email shouldn't be
// at the mercy of whatever a client script decides to POST.
const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254
const MAX_MESSAGE_LENGTH = 5000

const ALLOWED_SUBJECTS = [
  'job-opportunity',
  'collaboration',
  'consulting',
  'speaking',
  'question',
  'feature-request',
  'other',
]

const SUBJECT_LABELS = {
  'job-opportunity': 'Job Opportunity',
  'collaboration': 'Collaboration',
  'consulting': 'Consulting',
  'speaking': 'Speaking Engagement',
  'question': 'General Question',
  'feature-request': 'Feature Request',
  'other': 'Other',
}

async function storeInSupabase(data) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, key)

  const { error } = await supabase.from('contact_submissions').insert([{
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
    submitted_at: new Date().toISOString(),
  }])

  if (error) console.error('[contact] supabase insert error', error.message)
}

async function sendEmailNotification(data) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  const subjectLabel = SUBJECT_LABELS[data.subject] || data.subject
  // Never interpolate raw user input into the email HTML — a crafted
  // name/message could otherwise inject markup into the notification.
  const safe = {
    name: escapeHtml(data.name),
    email: escapeHtml(data.email),
    message: escapeHtml(data.message),
  }

  await resend.emails.send({
    from: 'Portfolio Contact <onboarding@resend.dev>',
    to: 'arukurmi22@gmail.com',
    subject: `[Portfolio] New message: ${subjectLabel}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 8px;">
        <h2 style="color: #a78bfa; margin-top: 0;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #94a3b8; width: 100px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${safe.name}</td></tr>
          <tr><td style="padding: 8px 0; color: #94a3b8;">Email</td><td style="padding: 8px 0;"><a href="mailto:${safe.email}" style="color: #a78bfa;">${safe.email}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #94a3b8;">Subject</td><td style="padding: 8px 0;">${subjectLabel}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 16px; background: #1e293b; border-radius: 6px; border-left: 3px solid #a78bfa;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Message</p>
          <p style="margin: 0; white-space: pre-wrap;">${safe.message}</p>
        </div>
        <p style="margin-top: 16px; color: #64748b; font-size: 12px;">Submitted from aryanshkurmi.com</p>
      </div>
    `,
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ ok: false, message: 'Method not allowed' })
  }

  const { name, email, subject, message } = req.body || {}

  const errors = {}

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.name = 'Name is required'
  } else if (name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters'
  } else if (name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `Name must be under ${MAX_NAME_LENGTH} characters`
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email is required'
  } else if (email.trim().length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please enter a valid email address'
  }

  if (!subject || !subject.trim()) {
    errors.subject = 'Subject is required'
  } else if (!ALLOWED_SUBJECTS.includes(subject)) {
    errors.subject = 'Please select a valid subject'
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    errors.message = 'Message is required'
  } else if (message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters'
  } else if (message.trim().length > MAX_MESSAGE_LENGTH) {
    errors.message = `Message must be under ${MAX_MESSAGE_LENGTH} characters`
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ ok: false, message: 'Validation failed', errors })
  }

  const data = {
    name: name.trim(),
    email: email.trim(),
    subject,
    message: message.trim(),
  }

  await Promise.allSettled([
    storeInSupabase(data),
    sendEmailNotification(data),
  ])

  return res.status(200).json({
    ok: true,
    message: "Thanks for reaching out! I'll get back to you soon.",
  })
}
