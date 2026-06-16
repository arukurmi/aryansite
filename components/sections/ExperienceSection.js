import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import TechBadge from '../ui/TechBadge'

export default function ExperienceSection() {
  const experiences = [
    {
      company: "GoKwik",
      role: "Software Development Engineer",
      duration: "Aug 2024 - Present · Bangalore",
      description: "Working in the Payments Pod and on GoKwik's MCP, building reliable infra, secure protocols, and data-accurate systems at scale.",
      tech: ["NestJS", "PostgreSQL", "Metabase", "AWS", "Kafka"],
      highlights: [
        "Shipped end-to-end split settlements infra, reducing Account Receivables (AR) delays from 30+ days to < 5 days.",
        "Revamped settlement data ingestion infra, cutting daily ingestion time by ~94% across 10,000+ merchants.",
        "Delivered 99.99% accurate settlement data via batch optimizations and safe error retries, reducing operational overhead by 70%.",
        "Improved automated reconciliation pipeline accuracy from ~70% to 99%, fixing critical gaps in anomaly detection.",
        "Owned end-to-end MCP server build with context routing, OAuth-secured flows, and structured protocol handling.",
        "Delivered MCP documentation and tooling for easy setup in both local and remote modes for internal teams and merchants.",
        "Mentored 2 engineers and led org-wide knowledge transfer sessions on MCP architecture."
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
        "Migrated the search persistence layer to TiDB, improving performance by 20% and saving $100K in annual platform fees."
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
