import { useState, useEffect } from 'react'
import Header from './Header'
import Footer from './Footer'

export default function Layout({ children, className = '' }) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className={`min-h-screen bg-transparent transition-colors duration-300 ${className}`}>
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
