import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import TechBadge from '../ui/TechBadge'

export default function ExperienceSection() {
  const experiences = [
    {
      company: "GoKwik",
      role: "Software Developer",
      duration: "Current",
      description: "Full-time software development role focusing on scalable solutions and modern technologies.",
      tech: ["Node.js", "React", "TypeScript", "PostgreSQL"],
      highlights: [
        "Building scalable microservices",
        "Implementing modern frontend solutions",
        "Optimizing database performance"
      ]
    },
    {
      company: "CoinDCX & Brane",
      role: "Software Developer",
      duration: "2 Years",
      description: "Built KYC backend service with Onfido API for international onboarding, supporting over 10,000 users.",
      tech: ["Node.js", "Ruby on Rails", "PostgreSQL", "Redis", "Docker"],
      highlights: [
        "Improved latency by 60% with indexing and Redis caching",
        "Implemented Grafana dashboards for logging and metrics",
        "Handled email and SMS notifications for 150k+ users",
        "Designed low-level architecture for referral program"
      ]
    },
    {
      company: "Internships",
      role: "Developer",
      duration: "Multiple",
      description: "Business Tech Labs & Fintract Global - Gained experience in Spring Boot, HTML, CSS, and product design.",
      tech: ["Spring Boot", "HTML", "CSS", "Figma"],
      highlights: [
        "Full-stack development experience",
        "Product design and user experience",
        "Cross-functional team collaboration"
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
