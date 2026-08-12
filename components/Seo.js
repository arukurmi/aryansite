import Head from 'next/head'

// One place that decides what a page says about itself to Google, to a
// Twitter/LinkedIn unfurl, and to the browser tab. Before this existed only
// /proof-of-work set any of it, so every other page — including all 29 blog
// posts, which have share buttons — unfurled as a bare URL.

export const SITE_URL = 'https://arukurmi.vercel.app'
export const SITE_NAME = 'Aryansh Kurmi'

const DEFAULT_DESCRIPTION =
  'Software developer. Interview post-mortems, system-design deep dives, and the layer beneath the answer I gave.'

// Unfurls truncate around here anyway, and an over-long description gets
// replaced wholesale by the crawler's own snippet.
const DESCRIPTION_MAX = 200

function truncate(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trimEnd()}…`
}

export default function Seo({
  title,
  description,
  path = '/',
  type = 'website',
  publishedTime,
  tags,
}) {
  // The home page is the one place the bare site name reads correctly;
  // everywhere else gets the "Page — Aryansh Kurmi" shape.
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME
  const desc = truncate(description || DEFAULT_DESCRIPTION, DESCRIPTION_MAX)
  const url = `${SITE_URL}${path}`

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />

      {/* No OG image asset exists yet, so `summary` is the honest card type —
          `summary_large_image` renders a broken banner without one. */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />

      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' &&
        tags?.map((tag) => <meta property="article:tag" content={tag} key={tag} />)}
    </Head>
  )
}
