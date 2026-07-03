import Head from 'next/head'
import Layout from '../components/layout/Layout'
import CompanyProofCard from '../components/proof/CompanyProofCard'
import ProjectProofCard from '../components/proof/ProjectProofCard'
import { companies, projects } from '../data/proofOfWork'

export default function ProofOfWork() {
  return (
    <Layout>
      <Head>
        <title>Proof of Work — Aryansh Kurmi</title>
        <meta
          name="description"
          content="Metrics-backed proof of impact: 6M+ transactions at 99.99% correctness, 3,000 QPS BFCM peaks, KYC automation for 250K+ users, and shipped projects with live links."
        />
        <meta property="og:title" content="Proof of Work — Aryansh Kurmi" />
        <meta
          property="og:description"
          content="Not just claims — charts, numbers, and live links. Impact at GoKwik and CoinDCX, plus shipped projects."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://arukurmi.vercel.app/proof-of-work" />
        <meta name="twitter:card" content="summary" />
      </Head>

      <div className="min-h-screen pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="section-title">
              <span className="gradient-text">Proof of Work</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Not just claims — charts, numbers, and live links.
            </p>
          </div>

          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-2">
              <span className="gradient-text">Experience</span>
            </h2>
            <p className="text-gray-400 mb-8">
              Measurable outcomes I owned, one metric at a time.
            </p>
            <div className="grid lg:grid-cols-2 gap-8">
              {companies.map((company) => (
                <CompanyProofCard key={company.id} company={company} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">
              <span className="gradient-text">Projects</span>
            </h2>
            <p className="text-gray-400 mb-8">
              Shipped and verifiable — screenshots and live deployments.
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              {projects.map((project) => (
                <ProjectProofCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  )
}
