import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), 'posts')

export function getAllPosts() {
  const allPosts = []
  
  // Get all subdirectories in posts folder
  const categories = fs.readdirSync(postsDirectory, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  categories.forEach(category => {
    const categoryPath = path.join(postsDirectory, category)
    const fileNames = fs.readdirSync(categoryPath)
    
    const categoryPosts = fileNames.map((fileName) => {
      const slug = fileName.replace(/\.md$/, '')
      const fullPath = path.join(categoryPath, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)
      
      return {
        slug,
        category,
        content,
        ...data
      }
    })
    
    allPosts.push(...categoryPosts)
  })

  // Sort posts by date
  return allPosts.sort((a, b) => {
    if (a.date < b.date) {
      return 1
    } else {
      return -1
    }
  })
}

export function getPostBySlug(slug) {
  const allPosts = getAllPosts()
  return allPosts.find(post => post.slug === slug)
}

export function getPostsByCategory(category) {
  const allPosts = getAllPosts()
  return allPosts.filter(post => post.category === category)
}

export function getAllCategories() {
  const categories = fs.readdirSync(postsDirectory, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
  
  return categories.map(category => ({
    name: category,
    displayName: category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    count: getPostsByCategory(category).length
  }))
}

export function getRecentPosts(limit = 5) {
  const allPosts = getAllPosts()
  return allPosts.slice(0, limit)
}

export function getRelatedPosts(currentSlug, limit = 3) {
  const allPosts = getAllPosts()
  const currentPost = getPostBySlug(currentSlug)
  
  if (!currentPost) return []
  
  const related = allPosts
    .filter(post => 
      post.slug !== currentSlug && 
      (post.category === currentPost.category || 
       post.tags?.some(tag => currentPost.tags?.includes(tag)))
    )
    .slice(0, limit)
  
  return related
}

export function searchPosts(query) {
  const allPosts = getAllPosts()
  const lowercaseQuery = query.toLowerCase()
  
  return allPosts.filter(post => 
    post.title?.toLowerCase().includes(lowercaseQuery) ||
    post.excerpt?.toLowerCase().includes(lowercaseQuery) ||
    post.content?.toLowerCase().includes(lowercaseQuery) ||
    post.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  )
}
