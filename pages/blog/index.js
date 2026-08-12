import { useState } from 'react'
import Link from 'next/link'
import Layout from '../../components/layout/Layout'
import Seo from '../../components/Seo'
import { getAllPostSummaries, getAllCategories } from '../../lib/blog'
import Button from '../../components/ui/Button'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function BlogIndex({ posts, categories }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [email, setEmail] = useState('')
  const [subscribeStatus, setSubscribeStatus] = useState(null) // 'success' | 'error' | null
  const [subscribeMessage, setSubscribeMessage] = useState('')
  const [isSubscribing, setIsSubscribing] = useState(false)

  // Fast lookup of a category's display metadata (label, colours, icon).
  const catBySlug = Object.fromEntries(categories.map((c) => [c.name, c]))

  const handleSubscribe = async (e) => {
    e.preventDefault()

    if (!EMAIL_REGEX.test(email.trim())) {
      setSubscribeStatus('error')
      setSubscribeMessage('Please enter a valid email address.')
      return
    }

    setIsSubscribing(true)
    setSubscribeStatus(null)
    setSubscribeMessage('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (res.ok && data.ok) {
        setSubscribeStatus('success')
        setSubscribeMessage(data.message)
        setEmail('')
      } else {
        setSubscribeStatus('error')
        setSubscribeMessage(data.message || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      setSubscribeStatus('error')
      setSubscribeMessage('Network error. Please try again.')
    } finally {
      setIsSubscribing(false)
    }
  }

  const filteredPosts = posts.filter((post) => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      !searchQuery ||
      post.title?.toLowerCase().includes(q) ||
      post.excerpt?.toLowerCase().includes(q) ||
      post.tags?.some((tag) => tag.toLowerCase().includes(q))

    return matchesCategory && matchesSearch
  })

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const activeLabel =
    selectedCategory === 'all' ? 'All Posts' : catBySlug[selectedCategory]?.displayName

  // A single nav item, shared by the desktop sidebar and the mobile chip row.
  const NavItem = ({ slug, label, count, icon, dot, active, onSelect, chip }) => {
    if (chip) {
      return (
        <button
          onClick={onSelect}
          className={`flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
            active
              ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
              : 'bg-dark-800/50 text-gray-400 border-dark-700 hover:text-white hover:border-dark-600'
          }`}
        >
          {icon ? <i className={`${icon} text-xs`} /> : <span className={`w-1.5 h-1.5 rounded-full ${dot || 'bg-gray-400'}`} />}
          {label}
          <span className="text-xs opacity-70">{count}</span>
        </button>
      )
    }
    return (
      <button
        onClick={onSelect}
        className={`group w-full flex items-center gap-3 pl-3 pr-2.5 py-2.5 rounded-lg border-l-2 transition-all duration-200 ${
          active
            ? 'border-primary-500 bg-primary-500/10 text-white'
            : 'border-transparent text-gray-400 hover:text-white hover:bg-dark-800/50'
        }`}
      >
        <i
          className={`${icon} w-4 text-center text-sm ${
            active ? 'text-primary-300' : 'text-gray-500 group-hover:text-gray-300'
          }`}
        />
        <span className="flex-1 text-left text-sm font-medium leading-tight">{label}</span>
        <span
          className={`text-xs tabular-nums px-1.5 py-0.5 rounded-md ${
            active ? 'bg-primary-500/20 text-primary-300' : 'bg-dark-700 text-gray-500'
          }`}
        >
          {count}
        </span>
      </button>
    )
  }

  return (
    <Layout className="blog-page">
      <Seo
        title="Writing"
        description="Interview post-mortems, system-design deep dives, language internals, and contest problems taken apart until the trick is obvious."
        path="/blog"
      />
      <div className="min-h-screen pt-36 md:pt-40 pb-24 md:pb-28">
        <div className="container mx-auto px-4">
          {/* Centered hero — matches the Proof of Work page's header treatment. */}
          <header className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
            <p className="eyebrow">The Notebook</p>
            <h1 className="section-title">
              <span className="gradient-text">Writing</span>
            </h1>
            <p className="lead">
              Interview post-mortems, system-design deep dives, and the layer beneath the
              answer I gave. Everything here started as a real question I had to answer out loud.
            </p>
          </header>

          {/* Two-column: sticky index nav + results.
              grid-cols-1 (= minmax(0,1fr)) keeps the single mobile column from
              growing to the cards' max-content width and overflowing. */}
          <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-8 lg:gap-10">
            {/* Sidebar (desktop) — a contained, elevated panel rather than
                bare links hugging the corner. */}
            <aside className="hidden lg:block">
              <nav
                className="sticky top-28 rounded-2xl border border-dark-700 bg-dark-800/50 backdrop-blur-sm p-3 shadow-xl shadow-black/30"
                aria-label="Blog categories"
              >
                <p className="px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Browse
                </p>
                <div className="space-y-1">
                  <NavItem
                    slug="all"
                    label="All Posts"
                    icon="fa-solid fa-layer-group"
                    count={posts.length}
                    active={selectedCategory === 'all'}
                    onSelect={() => setSelectedCategory('all')}
                  />
                  <div className="my-2 h-px bg-dark-700" />
                  {categories.map((category) => (
                    <NavItem
                      key={category.name}
                      slug={category.name}
                      label={category.displayName}
                      icon={category.icon}
                      count={category.count}
                      active={selectedCategory === category.name}
                      onSelect={() => setSelectedCategory(category.name)}
                    />
                  ))}
                </div>
              </nav>
            </aside>

            {/* Results column */}
            <div>
              {/* Search */}
              <div className="relative mb-5">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search posts, topics, tags…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
                />
              </div>

              {/* Category chips (mobile only) */}
              <div className="lg:hidden -mx-4 px-4 mb-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <NavItem
                  chip
                  label="All"
                  count={posts.length}
                  icon="fa-solid fa-layer-group"
                  active={selectedCategory === 'all'}
                  onSelect={() => setSelectedCategory('all')}
                />
                {categories.map((category) => (
                  <NavItem
                    key={category.name}
                    chip
                    label={category.displayName}
                    count={category.count}
                    dot={category.dot}
                    active={selectedCategory === category.name}
                    onSelect={() => setSelectedCategory(category.name)}
                  />
                ))}
              </div>

              {/* Result meta line */}
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="text-white font-semibold">
                  {activeLabel}
                  <span className="text-gray-500 font-normal ml-2">
                    {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
                  </span>
                </h2>
              </div>

              {/* Cards */}
              {filteredPosts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {filteredPosts.map((post) => {
                    const cat = catBySlug[post.category]
                    return (
                      <Link
                        key={post.slug}
                        href={`/blog/${post.slug}`}
                        className="group relative flex flex-col overflow-hidden rounded-2xl border border-dark-700 bg-dark-800/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-500/40 hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
                      >
                        {/* Category spine */}
                        <span
                          className={`absolute inset-y-0 left-0 w-1 ${cat?.dot || 'bg-primary-500'}`}
                          aria-hidden="true"
                        />

                        <div className="flex flex-col flex-1 p-5 pl-6">
                          {/* Top row */}
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                cat?.pill || 'bg-primary-500/15 text-primary-300 border border-primary-500/25'
                              }`}
                            >
                              {cat?.icon && <i className={`${cat.icon} text-[10px]`} />}
                              {cat?.displayName || post.category}
                            </span>
                            <span className="text-gray-500 text-xs whitespace-nowrap">
                              {formatDate(post.date)}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-lg font-bold text-white leading-snug mb-2 line-clamp-2 group-hover:text-primary-300 transition-colors duration-300">
                            {post.title}
                          </h3>

                          {/* Excerpt */}
                          <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-4 flex-1">
                            {post.excerpt}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between gap-3 pt-3 border-t border-dark-700">
                            <div className="flex flex-wrap gap-1.5 min-w-0">
                              {post.tags?.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[11px] text-gray-500 bg-dark-700 px-2 py-0.5 rounded-md truncate"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            <span className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                              <i className="far fa-clock" />
                              {post.readingTime} min
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-dark-700 rounded-2xl">
                  <i className="fas fa-magnifying-glass text-4xl text-gray-600 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No posts found</h3>
                  <p className="text-gray-400">
                    {searchQuery
                      ? `Nothing matches “${searchQuery}”. Try another term.`
                      : `No posts in this category yet.`}
                  </p>
                </div>
              )}

              {/* Newsletter Signup */}
              <div id="newsletter" className="mt-16">
                <div className="rounded-2xl border border-dark-700 bg-dark-800/50 backdrop-blur-sm p-8 text-center shadow-xl shadow-black/20">
                  <h3 className="text-2xl font-bold text-white mb-3">Stay Updated</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Get notified when I publish new posts on system design, interviews, and what
                    lives one layer down.
                  </p>
                  <form
                    onSubmit={handleSubscribe}
                    className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="flex-1 px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
                    />
                    <Button
                      type="submit"
                      loading={isSubscribing}
                      disabled={isSubscribing}
                      className="whitespace-nowrap"
                    >
                      {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                    </Button>
                  </form>
                  {subscribeStatus && (
                    <p
                      className={`mt-4 text-sm font-medium ${
                        subscribeStatus === 'success' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {subscribeMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export async function getStaticProps() {
  const posts = await getAllPostSummaries()
  const categories = await getAllCategories()

  return {
    props: {
      posts,
      categories,
    },
  }
}
