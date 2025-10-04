import Layout from '../components/layout/Layout'
import HeroSection from '../components/sections/HeroSection'
import ExperienceSection from '../components/sections/ExperienceSection'
import BlogSection from '../components/sections/BlogSection'
import { getRecentPosts } from '../lib/blog'

export default function Home({ recentPosts }) {
  return (
    <Layout>
      <HeroSection />
      <ExperienceSection />
      <BlogSection recentPosts={recentPosts} />
    </Layout>
  )
}

export async function getStaticProps() {
  const recentPosts = await getRecentPosts(3)
  
  return {
    props: {
      recentPosts
    }
  }
}