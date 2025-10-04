import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/layout/Layout'
import { getAllPosts, getPostBySlug, getRelatedPosts } from '../../lib/blog'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import TechBadge from '../../components/ui/TechBadge'
import Button from '../../components/ui/Button'

export default function BlogPost({ post, relatedPosts }) {
  const router = useRouter()
  const [readingProgress, setReadingProgress] = useState(0)

  useEffect(() => {
    const updateReadingProgress = () => {
      const scrollTop = window.scrollY
      const docHeight = document.body.scrollHeight - window.innerHeight
      const scrollPercent = (scrollTop / docHeight) * 100
      setReadingProgress(scrollPercent)
    }

    window.addEventListener('scroll', updateReadingProgress)
    return () => window.removeEventListener('scroll', updateReadingProgress)
  }, [])

  if (!post) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Post Not Found</h1>
            <p className="text-gray-400 mb-8">The blog post you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/blog')}>
              Back to Blog
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

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
      <div className="min-h-screen">
        {/* Reading Progress Bar */}
        <div className="fixed top-0 left-0 w-full h-1 bg-dark-700 z-50">
          <div 
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-150"
            style={{ width: `${readingProgress}%` }}
          />
        </div>

        {/* Article Header */}
        <article className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="mb-8"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back
              </Button>

              {/* Post Meta */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <TechBadge variant="primary" size="md">
                    {post.category.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </TechBadge>
                  <span className="text-gray-400 text-sm">
                    {formatDate(post.date)} • {getReadingTime(post.content)} min read
                  </span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                  {post.title}
                </h1>
                
                <p className="text-xl text-gray-300 mb-6 leading-relaxed">
                  {post.excerpt}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {post.tags?.map((tag) => (
                    <TechBadge key={tag} size="sm">
                      {tag}
                    </TechBadge>
                  ))}
                </div>

                {/* Author Info */}
                <div className="flex items-center space-x-4 p-4 bg-dark-800/50 rounded-lg border border-dark-700">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">AK</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Aryansh Kurmi</p>
                    <p className="text-gray-400 text-sm">Software Developer</p>
                  </div>
                </div>
              </div>

              {/* Article Content */}
              <div className="prose prose-lg prose-invert max-w-none">
                <div 
                  className="text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </div>

              {/* Social Sharing */}
              <div className="mt-12 p-6 bg-dark-800/50 rounded-lg border border-dark-700">
                <h3 className="text-white font-semibold mb-4">Share this post</h3>
                <div className="flex space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = encodeURIComponent(window.location.href)
                      const text = encodeURIComponent(post.title)
                      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
                    }}
                  >
                    <i className="fab fa-twitter mr-2"></i>
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = encodeURIComponent(window.location.href)
                      const title = encodeURIComponent(post.title)
                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`, '_blank')
                    }}
                  >
                    <i className="fab fa-linkedin mr-2"></i>
                    LinkedIn
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="py-16 bg-dark-800/30">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-8 text-center">
                  Related Posts
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedPosts.map((relatedPost, index) => (
                    <Card
                      key={relatedPost.slug}
                      className="hover:scale-105 transition-all duration-300 cursor-pointer group"
                      onClick={() => router.push(`/blog/${relatedPost.slug}`)}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CardHeader>
                        <TechBadge variant="primary" size="sm" className="mb-2">
                          {relatedPost.category.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </TechBadge>
                        <CardTitle className="text-lg group-hover:text-primary-400 transition-colors duration-300">
                          {relatedPost.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                          {relatedPost.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs">
                            {formatDate(relatedPost.date)}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {getReadingTime(relatedPost.content)} min read
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </Layout>
  )
}

export async function getStaticPaths() {
  const posts = getAllPosts()
  const paths = posts.map((post) => ({
    params: { slug: post.slug },
  }))

  return {
    paths,
    fallback: false,
  }
}

export async function getStaticProps({ params }) {
  const post = getPostBySlug(params.slug)
  const relatedPosts = getRelatedPosts(params.slug, 3)

  return {
    props: {
      post,
      relatedPosts,
    },
  }
}
