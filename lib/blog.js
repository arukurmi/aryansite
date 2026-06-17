import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkHtml from 'remark-html'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeCodeTitles from 'rehype-code-titles'

const postsDirectory = path.join(process.cwd(), 'posts')

// Process markdown content to HTML
async function processMarkdown(content) {
  const processedContent = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(content)

  return processedContent.toString()
}

// ~200 wpm reading-time estimate from the rendered content
function computeReadingTime(html) {
  const words = html.split(/\s+/).filter(Boolean).length
  return Math.ceil(words / 200)
}

// Lightweight view of a post for lists/cards — drops the heavy
// `content` (full HTML) and `rawContent` (full markdown) fields.
function toSummary(post) {
  const { content, rawContent, ...summary } = post
  return summary
}

// Cache the full post set during production builds (data is immutable
// at build time). Left uncached in dev so edits show on refresh.
let _allPostsCache = null

export async function getAllPosts() {
  if (_allPostsCache && process.env.NODE_ENV === 'production') {
    return _allPostsCache
  }

  const allPosts = []

  // Get all subdirectories in posts folder
  const categories = fs.readdirSync(postsDirectory, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  for (const category of categories) {
    const categoryPath = path.join(postsDirectory, category)
    const fileNames = fs.readdirSync(categoryPath)

    for (const fileName of fileNames) {
      const slug = fileName.replace(/\.md$/, '')
      const fullPath = path.join(categoryPath, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)

      // Process markdown content
      const processedContent = await processMarkdown(content)

      allPosts.push({
        slug,
        category,
        content: processedContent,
        rawContent: content, // Keep raw content for search
        readingTime: computeReadingTime(processedContent),
        ...data
      })
    }
  }

  // Sort posts by date
  const sorted = allPosts.sort((a, b) => {
    if (a.date < b.date) {
      return 1
    } else {
      return -1
    }
  })

  if (process.env.NODE_ENV === 'production') {
    _allPostsCache = sorted
  }
  return sorted
}

// Lightweight list of every post (no full content) — for listing pages.
export async function getAllPostSummaries() {
  const allPosts = await getAllPosts()
  return allPosts.map(toSummary)
}

export async function getPostBySlug(slug) {
  // Read and parse only the one file this slug maps to, instead of
  // processing every post just to pick one.
  const categories = fs.readdirSync(postsDirectory, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  for (const category of categories) {
    const fullPath = path.join(postsDirectory, category, `${slug}.md`)
    if (fs.existsSync(fullPath)) {
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)
      const processedContent = await processMarkdown(content)

      return {
        slug,
        category,
        content: processedContent,
        rawContent: content,
        readingTime: computeReadingTime(processedContent),
        ...data
      }
    }
  }
  return undefined
}

export async function getPostsByCategory(category) {
  const allPosts = await getAllPosts()
  return allPosts.filter(post => post.category === category)
}

export async function getAllCategories() {
  const allPosts = await getAllPosts()
  const categories = fs.readdirSync(postsDirectory, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
  
  return categories.map(category => ({
    name: category,
    displayName: category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    count: allPosts.filter(post => post.category === category).length
  }))
}

export async function getRecentPosts(limit = 5) {
  const allPosts = await getAllPosts()
  return allPosts.slice(0, limit)
}

export async function getRelatedPosts(currentSlug, limit = 3) {
  const allPosts = await getAllPosts()
  const currentPost = allPosts.find(post => post.slug === currentSlug)
  
  if (!currentPost) return []
  
  const related = allPosts
    .filter(post =>
      post.slug !== currentSlug &&
      (post.category === currentPost.category ||
       post.tags?.some(tag => currentPost.tags?.includes(tag)))
    )
    .slice(0, limit)

  return related.map(toSummary)
}

export async function searchPosts(query) {
  const allPosts = await getAllPosts()
  const lowercaseQuery = query.toLowerCase()
  
  return allPosts.filter(post => 
    post.title?.toLowerCase().includes(lowercaseQuery) ||
    post.excerpt?.toLowerCase().includes(lowercaseQuery) ||
    post.rawContent?.toLowerCase().includes(lowercaseQuery) ||
    post.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  )
}
