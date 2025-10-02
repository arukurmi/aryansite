import { useState, useEffect } from 'react'
import Button from '../ui/Button'
import TechBadge from '../ui/TechBadge'

export default function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentText, setCurrentText] = useState('')
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

  const techStack = ['Node.js', 'React', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker']

  return (
    <section className="min-h-screen flex items-center justify-center relative">
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
              Electrical Engineering Grad turned Software Developer. 
              <br className="hidden md:block" />
              <span className="text-primary-400 font-semibold">Funny, sarcastic, and always up for a challenge.</span>
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
  )
}
