import Layout from '../components/layout/Layout'
import Seo from '../components/Seo'
import HeroSection from '../components/sections/HeroSection'
import BlogSection from '../components/sections/BlogSection'
import ContactSection from '../components/sections/ContactSection'
import { getRecentPosts } from '../lib/blog'

export default function Home({ recentPosts }) {
  return (
    <Layout>
      <Seo
        description="Software developer working on payments and scale. Interview post-mortems, system-design deep dives, and the layer beneath the answer I gave."
        path="/"
      />
      <HeroSection />
      <BlogSection recentPosts={recentPosts} />
      <ContactSection />
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