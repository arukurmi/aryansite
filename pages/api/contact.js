const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  await resend.emails.send({
    from: 'Portfolio Contact <onboarding@resend.dev>',
    to: 'arukurmi22@gmail.com',
    subject: `[Portfolio] New message: ${subjectLabel}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 8px;">
        <h2 style="color: #a78bfa; margin-top: 0;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #94a3b8; width: 100px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${data.name}</td></tr>
          <tr><td style="padding: 8px 0; color: #94a3b8;">Email</td><td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #a78bfa;">${data.email}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #94a3b8;">Subject</td><td style="padding: 8px 0;">${subjectLabel}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 16px; background: #1e293b; border-radius: 6px; border-left: 3px solid #a78bfa;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Message</p>
          <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
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

  if (!name || !name.trim()) {
    errors.name = 'Name is required'
  } else if (name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters'
  }

  if (!email || !email.trim()) {
    errors.email = 'Email is required'
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please enter a valid email address'
  }

  if (!subject || !subject.trim()) {
    errors.subject = 'Subject is required'
  } else if (!ALLOWED_SUBJECTS.includes(subject)) {
    errors.subject = 'Please select a valid subject'
  }

  if (!message || !message.trim()) {
    errors.message = 'Message is required'
  } else if (message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters'
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
