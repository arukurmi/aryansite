import { useState, useEffect } from 'react'
import Button from '../ui/Button'
import TechBadge from '../ui/TechBadge'

const FULL_TEXT = "Hi! I'm Aryansh Kurmi"

export default function HeroSection() {
  const [currentText, setCurrentText] = useState('')

  useEffect(() => {
    // Typing animation. Purely decorative — the real heading text is always
    // in the DOM (see the sr-only span below), so this drives a span that
    // assistive tech ignores.
    let i = 0
    let timer
    const typeWriter = () => {
      if (i < FULL_TEXT.length) {
        setCurrentText(FULL_TEXT.substring(0, i + 1))
        i++
        timer = setTimeout(typeWriter, 100)
      }
    }
    timer = setTimeout(typeWriter, 1000)
    return () => clearTimeout(timer)
  }, [])

  const techStack = ['TypeScript', 'Node.js', 'AI Agents', 'LLMs', 'MCP', 'PostgreSQL', 'Docker']

  return (
    <>
      <section className="min-h-screen flex items-center justify-center relative z-10">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            {/* Hero Content */}
          <div className="hero-rise">
            {/* min-height reserves the line the typewriter is about to fill,
                so the rest of the hero doesn't get shoved down when the first
                character lands a second after paint. */}
            <h1 className="text-6xl md:text-8xl font-bold mb-6 min-h-[3.75rem] md:min-h-[6rem]">
              {/* The heading text ships in the HTML for crawlers, screen
                  readers and no-JS visitors. The typewriter used to be the
                  only source of it, which left the site's single <h1> empty
                  in the prerendered markup until a 1s timer fired. */}
              <span className="sr-only">{FULL_TEXT}</span>
              <span className="gradient-text typing-animation" aria-hidden="true">
                {currentText}
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Software Developer building AI-native systems.
              <br className="hidden md:block" />
              <span className="text-primary-400 font-semibold">Shipping agents, LLM workflows, and MCP tooling into production — and using AI to build, every single day.</span>
            </p>
          </div>

          {/* Tech Stack */}
          <div className="hero-rise hero-rise-2">
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {techStack.map((tech, index) => (
                <TechBadge
                  key={tech}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {tech}
                </TechBadge>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center hero-rise hero-rise-3">
            <Button
              size="lg"
              className="text-lg px-8 py-4"
              onClick={() => window.open('https://drive.google.com/file/d/1886vZeTRqPPvchbldM-3D5KE_KChNOs1/view?usp=sharing', '_blank')}
            >
              <i className="fas fa-file-alt mr-2"></i>
              View My Resume
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="text-lg px-8 py-4"
              onClick={() => window.open('https://github.com/arukurmi', '_blank')}
            >
              <i className="fab fa-github mr-2"></i>
              Checkout GitHub
            </Button>
          </div>

          {/* Scroll Indicator */}
          <div className="mt-16 hero-rise hero-rise-4">
            <div className="animate-bounce">
              <i className="fas fa-chevron-down text-primary-400 text-2xl"></i>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  )
}
