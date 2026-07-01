import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import TechBadge from '../ui/TechBadge'

export default function ProjectsSection() {
  const projects = [
    {
      name: "Creator Nexus",
      tagline: "AI influencer-marketing platform",
      points: [
        "Allocates a brand's budget into an optimal creator mix using a budget-capped greedy-knapsack engine (Strategy/Registry patterns), with Supabase auth and Redis caching.",
        "A Gemini-powered strategist turns a free-text brief into schema-validated creator picks; built in Claude Code via Superpowers subagent-driven TDD (180+ tests)."
      ],
      tech: ["Gemini", "Supabase", "Redis"],
      links: {
        live: "https://creator-nexus-virid.vercel.app/",
        github: "https://github.com/arukurmi/CreatorNexus"
      }
    },
    {
      name: "Smart Triage Hub",
      tagline: "AI issue-triage for open-source contributors",
      points: [
        "Replaces stale \"good-first-issue\" labels with live LLM difficulty-scoring of GitHub issues across 5 language ecosystems.",
        "Event-driven backend: a nightly cron ingests and scores issues via Gemini, and merge webhooks award contributor XP through atomic Supabase writes."
      ],
      tech: ["Gemini", "Supabase", "Webhooks"],
      links: {
        live: "https://smart-triage-hub.vercel.app/",
        github: "https://github.com/arukurmi/SmartTriageHub"
      }
    },
    {
      name: "Log Zilla",
      tagline: "Self-hosted real-time log observability",
      points: [
        "Streams any service's logs through a Fluent Bit → SQLite → Socket.io → React pipeline into a live dashboard, with a custom query DSL (wildcard, negation, key-value).",
        "Auto-detects multiple service streams; the whole containerized pipeline was agent-scaffolded end-to-end."
      ],
      tech: ["Fluent Bit", "SQLite", "Socket.io", "React"],
      links: {
        github: "https://github.com/arukurmi/Log-zilla"
      }
    },
    {
      name: "Rate the Date",
      tagline: "Couples-communication app",
      points: [
        "Turns partner ratings across the 5 love languages into a personalized, AI-written letter delivered by email — helping couples say the hard-to-say things.",
        "Gemini generates tone-conditioned letters from structured ratings; secured with JWT and field-level encryption."
      ],
      tech: ["Gemini", "JWT", "Node.js"],
      links: {
        live: "https://superlative-hummingbird-bdc4f0.netlify.app/",
        github: "https://github.com/arukurmi/ratethedate"
      }
    }
  ]

  return (
    <section id="projects" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-title">
            <span className="gradient-text">Projects</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Things I've built — where solid engineering meets AI and agentic workflows.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <Card
              key={project.name}
              className="hover:scale-105 transition-all duration-300 flex flex-col"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <CardHeader>
                <CardTitle className="text-primary-400">{project.name}</CardTitle>
                <p className="text-white font-semibold text-lg">{project.tagline}</p>
              </CardHeader>

              <CardContent className="flex flex-col flex-1">
                <ul className="text-gray-400 text-sm space-y-2 mb-4">
                  {project.points.map((point, i) => (
                    <li key={i} className="flex items-start">
                      <i className="fas fa-check text-primary-400 mr-2 mt-1 text-xs"></i>
                      {point}
                    </li>
                  ))}
                </ul>

                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech) => (
                      <TechBadge key={tech} size="sm">
                        {tech}
                      </TechBadge>
                    ))}
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-4 pt-2">
                  {project.links.live && (
                    <a
                      href={project.links.live}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-primary-400 font-medium text-sm transition-colors duration-300"
                    >
                      <i className="fas fa-external-link-alt mr-2"></i>
                      Live
                    </a>
                  )}
                  {project.links.github && (
                    <a
                      href={project.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-primary-400 font-medium text-sm transition-colors duration-300"
                    >
                      <i className="fab fa-github mr-2"></i>
                      GitHub
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
