// Newsletter subscribe endpoint.
// No database is wired up yet, so this validates the email and returns a
// proper response. Swap the "TODO: persist" block for a real DB insert /
// mailing-list call once that's available.

// A subscribe payload is one email address — 8kb is generous.
export const config = {
  api: { bodyParser: { sizeLimit: '8kb' } },
}

import { rateLimit, getClientIp } from '../../lib/rateLimit'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ ok: false, message: 'Method not allowed' })
  }

  const { limited, retryAfterSeconds } = rateLimit({
    key: `subscribe:${getClientIp(req)}`,
    limit: 5,
    windowMs: 10 * 60 * 1000,
  })
  if (limited) {
    res.setHeader('Retry-After', retryAfterSeconds)
    return res
      .status(429)
      .json({ ok: false, message: 'Too many attempts — please try again in a few minutes.' })
  }

  const { email } = req.body || {}

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ ok: false, message: 'Email is required' })
  }

  if (email.trim().length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email.trim())) {
    return res
      .status(400)
      .json({ ok: false, message: 'Please enter a valid email address' })
  }

  // TODO: persist subscriber to DB / mailing list once connected.
  console.log('[subscribe] new subscriber', email.trim())

  return res.status(200).json({
    ok: true,
    message: "You're subscribed! Thanks for joining.",
  })
}
