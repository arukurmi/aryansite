import { getAllPostSummaries } from '../lib/blog'
import { SITE_URL } from '../components/Seo'

// Generated per-request rather than checked in, so adding a .md file to
// posts/ is the only step needed to get it indexed — there is no second
// place to remember to update.

const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/blog', priority: '0.9', changefreq: 'weekly' },
  { path: '/proof-of-work', priority: '0.8', changefreq: 'monthly' },
]

function urlEntry({ path, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${SITE_URL}${path}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function getServerSideProps({ res }) {
  const posts = await getAllPostSummaries()

  // getAllPostSummaries is sorted newest-first, so the first entry dates the
  // listing pages too.
  const newest = posts[0]?.date

  const entries = [
    ...STATIC_PAGES.map((page) =>
      urlEntry({ ...page, lastmod: page.path === '/proof-of-work' ? undefined : newest })
    ),
    ...posts.map((post) =>
      urlEntry({
        path: `/blog/${post.slug}`,
        lastmod: post.date,
        changefreq: 'yearly',
        priority: '0.7',
      })
    ),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate')
  res.write(xml)
  res.end()

  return { props: {} }
}

// Never rendered — getServerSideProps writes the response directly.
export default function Sitemap() {
  return null
}
