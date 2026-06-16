// Newsletter subscribe endpoint.
// No database is wired up yet, so this validates the email and returns a
// proper response. Swap the "TODO: persist" block for a real DB insert /
// mailing-list call once that's available.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ ok: false, message: 'Method not allowed' })
  }

  const { email } = req.body || {}

  if (!email || !email.trim()) {
    return res.status(400).json({ ok: false, message: 'Email is required' })
  }

  if (!EMAIL_REGEX.test(email.trim())) {
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
