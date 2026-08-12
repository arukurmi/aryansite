import Layout from '../components/layout/Layout'
import Seo from '../components/Seo'
import CompanyProofCard from '../components/proof/CompanyProofCard'
import ProjectProofCard from '../components/proof/ProjectProofCard'
import { companies, projects } from '../data/proofOfWork'

export default function ProofOfWork() {
  return (
    <Layout>
      <Seo
        title="Proof of Work"
        description="Metrics-backed proof of impact: 6M+ transactions at 99.99% correctness, 3,000 QPS BFCM peaks, KYC automation for 250K+ users, and shipped projects with live links."
        path="/proof-of-work"
      />

      <div className="min-h-screen pt-36 md:pt-40 pb-28 md:pb-36">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-24 md:mb-32">
            <p className="eyebrow">Metrics-backed impact</p>
            <h1 className="section-title">
              <span className="gradient-text">Proof of Work</span>
            </h1>
            <p className="lead">
              Not just claims — charts, numbers, and live links.
            </p>
          </div>

          <section>
            <div className="text-center mb-14 md:mb-16">
              <h2 className="subsection-title">
                <span className="gradient-text">Experience</span>
              </h2>
              <p className="lead">
                Measurable outcomes I owned, one metric at a time.
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
              {companies.map((company) => (
                <CompanyProofCard key={company.id} company={company} />
              ))}
            </div>
          </section>

          <hr className="section-divider w-full max-w-2xl mx-auto my-20 md:my-28" />

          <section>
            <div className="text-center mb-14 md:mb-16">
              <p className="eyebrow">Shipped &amp; verifiable · {projects.length} projects</p>
              <h2 className="subsection-title">
                <span className="gradient-text">Projects</span>
              </h2>
              <p className="lead">
                Shipped and verifiable — screenshots and live deployments.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
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
