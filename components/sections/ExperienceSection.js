import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import TechBadge from '../ui/TechBadge'

export default function ExperienceSection() {
  const experiences = [
    {
      company: "GoKwik",
      role: "Software Development Engineer",
      duration: "Aug 2024 - Present · Bangalore",
      description: "Working in the Payments Pod and on GoKwik's MCP, building reliable infra, secure protocols, and data-accurate systems at scale.",
      tech: ["NestJS", "Go", "PostgreSQL", "RabbitMQ", "AWS"],
      highlights: [
        "Own the settlements (payout) engine end-to-end — an idempotent, retry-safe ingestion pipeline with row-level fault isolation, sustaining 99.99% data correctness across all payouts.",
        "Pioneered Pay-After-Delivery, a new event-driven checkout method over RabbitMQ (NPCI + Plada) with delivery-triggered one-time-mandate auto-debit; shipped in ~3 days vs a ~10-day estimate via agentic workflows; extensible for a recurring Subscribe-and-Save model.",
        "Lead payments on-call through our Black Friday sale — auto-scaled payment microservices to ~3,000 QPS peak and 6M+ transactions across 10,000+ merchants (vs ~2M+ baseline) at zero downtime.",
        "Built and hosted GoKwik's MCP server (context routing, OAuth-secured flows, structured protocol handling) plus a mock GoKwik MCP for team enablement.",
        "Hardened 17 NestJS/Node payment microservices with circuit-breaker and graceful-shutdown patterns; optimized the Jenkins CI pipeline for a 96% build-time reduction.",
        "Built a Go + AWS SQS/Lambda self-serve bulk-upload platform — removed ~2,000 manual merchant updates per month and saved BizOps ~40 hours/week.",
        "Drove agentic-coding adoption across the pod (Claude Code/CLI, sub-agents, Greptile, Codex); lifted settlement test coverage 16%→100% with test-generation agents; mentored engineers and led Sev-1/2 RCAs (60+ critical, 200+ minor)."
      ]
    },
    {
      company: "Brane Enterprises",
      role: "Associate Solution Developer · Platform Integrations",
      duration: "Jan 2024 - Jul 2024 · Bangalore",
      description: "Worked on Brane's no-code full-stack platform, building platform integrations and improving search and reliability.",
      tech: ["Java", "JUnit", "TiDB"],
      highlights: [
        "Integrated faceted search into Java-based modules, enabling efficient multi-criteria filtering and faster data retrieval.",
        "Built a reporting system for the no-code platform and raised test coverage to 98% on the core repo using JUnit.",
        "Migrated the search persistence layer to TiDB, improving performance by 20% and saving $40K in annual platform fees."
      ]
    },
    {
      company: "CoinDCX",
      role: "Software Development Engineer · Auth & User Engagement",
      duration: "Jun 2022 - Dec 2023 · Bangalore",
      description: "Owned KYC, authentication, and user-engagement backends serving hundreds of thousands of international users.",
      tech: ["Node.js", "Ruby on Rails", "Python", "AdminJS", "Sidekiq", "PostgreSQL"],
      highlights: [
        "Optimized KYC workflows with Onfido APIs, automating verification for 250K+ international users with resilient async processing and failure handling.",
        "Built an internal AdminJS dashboard to monitor 1M+ user records, improving operational visibility and reducing engineering dependency.",
        "Wrote production-grade data migration scripts (Ruby/Python) maintaining integrity of 10M+ user records with validation and rollback-safe handling.",
        "Shipped Node.js authentication APIs for SSO-based identity federation, improving login reliability across product flows.",
        "Implemented Sidekiq async workers for Email/SMS notifications serving 800K+ users with reliable retry-backed delivery.",
        "Maintained 98%+ test coverage via TDD, improving release stability and reducing regressions."
      ]
    }
  ]

  return (
    <section id="experience" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-title">
            <span className="gradient-text">Experience</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Building amazing things with code, one commit at a time.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {experiences.map((exp, index) => (
            <Card
              key={index}
              className="hover:scale-105 transition-all duration-300"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <CardHeader>
                <CardTitle className="text-primary-400">{exp.company}</CardTitle>
                <p className="text-white font-semibold text-lg">{exp.role}</p>
                <p className="text-gray-400 text-sm">{exp.duration}</p>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-300 mb-4">{exp.description}</p>
                
                <div className="mb-4">
                  <h4 className="text-white font-semibold mb-2">Key Achievements:</h4>
                  <ul className="text-gray-400 text-sm space-y-1">
                    {exp.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start">
                        <i className="fas fa-check text-primary-400 mr-2 mt-1 text-xs"></i>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-white font-semibold mb-2">Tech Stack:</h4>
                  <div className="flex flex-wrap gap-2">
                    {exp.tech.map((tech) => (
                      <TechBadge key={tech} size="sm">
                        {tech}
                      </TechBadge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
