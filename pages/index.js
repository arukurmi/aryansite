import { useState, useEffect } from 'react'

export default function Home() {
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
        <div className="absolute inset-0 bg-hero-pattern opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent"></div>
      </div>

      {/* Floating Particles */}
      <div className="particles">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${6 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="text-center">
          {/* Hero Section */}
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

          {/* Tech Stack Preview */}
          <div className={`transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {['Node.js', 'React', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker'].map((tech, index) => (
                <span
                  key={tech}
                  className="tech-badge"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 delay-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <button className="btn-primary text-lg px-8 py-4">
              <i className="fas fa-file-alt mr-2"></i>
              View My Resume
            </button>
            <button className="btn-secondary text-lg px-8 py-4">
              <i className="fab fa-github mr-2"></i>
              Checkout GitHub
            </button>
          </div>

          {/* Scroll Indicator */}
          <div className={`mt-16 transition-all duration-1000 delay-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="animate-bounce">
              <i className="fas fa-chevron-down text-primary-400 text-2xl"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Experience Preview Section */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="section-title">
            <span className="gradient-text">Experience</span>
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              company: "GoKwik",
              role: "Software Developer",
              duration: "Current",
              description: "Full-time software development role"
            },
            {
              company: "CoinDCX & Brane",
              role: "Software Developer",
              duration: "2 Years",
              description: "Built KYC backend, improved latency by 60%, handled 150k+ users"
            },
            {
              company: "Internships",
              role: "Developer",
              duration: "Multiple",
              description: "Business Tech Labs & Fintract Global"
            }
          ].map((exp, index) => (
            <div
              key={index}
              className="card hover:scale-105 transition-all duration-300"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <h3 className="text-xl font-bold text-white mb-2">{exp.company}</h3>
              <p className="text-primary-400 font-semibold mb-2">{exp.role}</p>
              <p className="text-gray-400 text-sm mb-3">{exp.duration}</p>
              <p className="text-gray-300 text-sm">{exp.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
