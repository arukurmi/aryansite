// Minimal fixed-window in-memory rate limiter for API routes.
// Good enough for a single-instance portfolio site: it stops casual
// spam/abuse without external infrastructure. Windows are pruned lazily
// so the map can't grow unbounded.

const buckets = new Map()

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || 'unknown'
}

export function rateLimit({ key, limit, windowMs }) {
  const now = Date.now()

  // Lazy prune: drop expired windows so memory stays bounded.
  if (buckets.size > 1000) {
    for (const [k, bucket] of buckets) {
      if (now - bucket.start >= windowMs) buckets.delete(k)
    }
  }

  const bucket = buckets.get(key)
  if (!bucket || now - bucket.start >= windowMs) {
    buckets.set(key, { start: now, count: 1 })
    return { limited: false, remaining: limit - 1 }
  }

  bucket.count += 1
  if (bucket.count > limit) {
    const retryAfterSeconds = Math.ceil((bucket.start + windowMs - now) / 1000)
    return { limited: true, remaining: 0, retryAfterSeconds }
  }
  return { limited: false, remaining: limit - bucket.count }
}
