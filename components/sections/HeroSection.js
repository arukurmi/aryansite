import { useState, useEffect } from 'react'
import Button from '../ui/Button'
import TechBadge from '../ui/TechBadge'
import FluidBackground from '../ui/FluidBackground'

export default function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentText, setCurrentText] = useState('')
  const [isFluidMode, setIsFluidMode] = useState(false)
  const fullText = "Hi! I'm Aryansh Kurmi"

  useEffect(() => {
    setIsLoaded(true)
    
    // Typing animation
    let i = 0
    const typeWriter = () => {
      if (i < fullText.length) {
        setCurrentText(fullText.substring(0, i + 1))
        i++
        setTimeout(typeWriter, 100)
      }
    }
    
    setTimeout(typeWriter, 1000)
  }, [])

  const techStack = ['TypeScript', 'Node.js', 'AI Agents', 'LLMs', 'MCP', 'PostgreSQL', 'Docker']

  return (
    <>
      {isFluidMode && <FluidBackground />}
      <section className="min-h-screen flex items-center justify-center relative z-10">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            {/* Hero Content */}
          <div className={`transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="gradient-text typing-animation">
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
          <div className={`transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
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
          <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 delay-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
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
          <div className={`mt-16 transition-all duration-1000 delay-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="animate-bounce">
              <i className="fas fa-chevron-down text-primary-400 text-2xl"></i>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Subtle Floating Toggle Button */}
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-1000 delay-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <button
        className="text-xs md:text-sm px-4 py-2 bg-dark-800/40 hover:bg-dark-700/60 backdrop-blur-md text-gray-400 hover:text-white rounded-full border border-dark-600/50 shadow-lg transition-all duration-300 flex items-center group"
        onClick={() => setIsFluidMode(!isFluidMode)}
      >
        <i className={`fas fa-palette mr-2 ${isFluidMode ? 'text-primary-400' : 'text-gray-500 group-hover:text-primary-400'} transition-colors`}></i>
        {isFluidMode ? "Go back to the plain background" : "Bored with the plain background?"}
      </button>
    </div>
    </>
  )
}
