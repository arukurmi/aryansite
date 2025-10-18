import { useState, useEffect } from 'react'
import Header from './Header'
import Footer from './Footer'

export default function Layout({ children, className = '' }) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className={`min-h-screen bg-dark-900 dark:bg-dark-900 light:bg-light-100 transition-colors duration-300 ${className}`}>
      {/* Simple background for blog pages */}
      {!className.includes('blog') && (
        <>
          {/* Animated Background */}
          <div className="absolute inset-0 bg-hero-pattern opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent"></div>
          
          {/* Floating Particles */}
          <div className="particles">
            {[...Array(30)].map((_, i) => (
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
        </>
      )}

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className={`relative z-10 transition-all duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
