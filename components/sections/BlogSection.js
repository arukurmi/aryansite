import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import TechBadge from '../ui/TechBadge'
import Button from '../ui/Button'

export default function BlogSection({ recentPosts }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getReadingTime = (content) => {
    const wordsPerMinute = 200
    const words = content.split(' ').length
    return Math.ceil(words / wordsPerMinute)
  }

  return (
    <section id="blog" className="py-20 bg-dark-800/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-title">
            <span className="gradient-text">Latest Blog Posts</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            Thoughts on system design, architecture, and development. 
            Learn from real-world examples and best practices.
          </p>
        </div>
        
        {recentPosts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {recentPosts.map((post, index) => (
              <Card
                key={post.slug}
                className="hover:scale-105 transition-all duration-300 cursor-pointer group"
                onClick={() => window.location.href = `/blog/${post.slug}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <TechBadge variant="primary" size="sm">
                      {post.category.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
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
                      {post.tags?.slice(0, 2).map((tag) => (
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
            <i className="fas fa-blog text-6xl text-gray-600 mb-4"></i>
            <h3 className="text-2xl font-bold text-white mb-2">No posts yet</h3>
            <p className="text-gray-400 mb-8">
              I'm working on some exciting content about system design and architecture.
            </p>
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/blog'}
            >
              View All Posts
            </Button>
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={() => window.location.href = '/blog'}
            className="mr-4"
          >
            <i className="fas fa-book-open mr-2"></i>
            Read All Posts
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => window.location.href = '/blog#newsletter'}
          >
            <i className="fas fa-bell mr-2"></i>
            Subscribe for Updates
          </Button>
        </div>
      </div>
    </section>
  )
}
