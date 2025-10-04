import { useState } from 'react'
import Layout from '../../components/layout/Layout'
import { getAllPosts, getAllCategories } from '../../lib/blog'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import TechBadge from '../../components/ui/TechBadge'
import Button from '../../components/ui/Button'

export default function BlogIndex({ posts, categories }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
    const matchesSearch = !searchQuery || 
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesCategory && matchesSearch
  })

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getReadingTime = (content) => {
    const wordsPerMinute = 200
    const words = content.split(' ').length
    return Math.ceil(words / wordsPerMinute)
  }

  return (
    <Layout>
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="section-title">
              <span className="gradient-text">Blog</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
              Thoughts on Low-Level Design, High-Level Design, System Architecture, and everything in between.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
                />
                <i className="fas fa-search absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <Button
                variant={selectedCategory === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All ({posts.length})
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.name}
                  variant={selectedCategory === category.name ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {category.displayName} ({category.count})
                </Button>
              ))}
            </div>
          </div>

          {/* Posts Grid */}
          {filteredPosts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, index) => (
                <Card
                  key={post.slug}
                  className="hover:scale-105 transition-all duration-300 cursor-pointer group"
                  onClick={() => window.location.href = `/blog/${post.slug}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <TechBadge variant="primary" size="sm">
                        {categories.find(c => c.name === post.category)?.displayName}
                      </TechBadge>
                      <span className="text-gray-500 text-sm">
                        {formatDate(post.date)}
                      </span>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary-400 transition-colors duration-300">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-400 mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {post.tags?.slice(0, 3).map((tag) => (
                          <TechBadge key={tag} size="sm" variant="default">
                            {tag}
                          </TechBadge>
                        ))}
                      </div>
                      <span className="text-gray-500 text-sm">
                        {getReadingTime(post.content)} min read
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <i className="fas fa-search text-6xl text-gray-600 mb-4"></i>
              <h3 className="text-2xl font-bold text-white mb-2">No posts found</h3>
              <p className="text-gray-400">
                {searchQuery 
                  ? `No posts match "${searchQuery}". Try a different search term.`
                  : `No posts in the "${selectedCategory}" category yet.`
                }
              </p>
            </div>
          )}

          {/* Newsletter Signup */}
          <div className="mt-20 text-center">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="text-center">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Stay Updated
                </h3>
                <p className="text-gray-400 mb-6">
                  Get notified when I publish new posts about system design, architecture, and development.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
                  />
                  <Button className="whitespace-nowrap">
                    Subscribe
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export async function getStaticProps() {
  const posts = await getAllPosts()
  const categories = await getAllCategories()
  
  return {
    props: {
      posts,
      categories
    }
  }
}
