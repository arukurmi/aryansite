// Contact form endpoint.
// No database / SMTP is wired up yet, so this validates the payload and
// returns a proper response. Swap the "TODO: persist/send" block for real
// delivery (DB insert or email) once credentials are available.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ALLOWED_SUBJECTS = [
  'job-opportunity',
  'collaboration',
  'consulting',
  'speaking',
  'question',
  'other',
]

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

  // TODO: persist to DB / send email once those are connected.
  console.log('[contact] new submission', {
    name: name.trim(),
    email: email.trim(),
    subject,
    message: message.trim(),
  })

  return res.status(200).json({
    ok: true,
    message: "Thanks for reaching out! I'll get back to you soon.",
  })
}
