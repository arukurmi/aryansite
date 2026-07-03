import { useState, useEffect } from 'react'
import Header from './Header'
import Footer from './Footer'
import SkyBackground from '../ui/SkyBackground'
import FluidBackground from '../ui/FluidBackground'

export default function Layout({ children, className = '' }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isFluidMode, setIsFluidMode] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className={`min-h-screen bg-transparent transition-colors duration-300 ${className}`}>
      <SkyBackground />
      {isFluidMode && <FluidBackground />}

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className={`relative z-10 transition-all duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        {children}
      </main>

      {/* Footer */}
      <Footer />

      {/* Fluid background toggle */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-1000 delay-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <button
          className="text-xs md:text-sm px-4 py-2 bg-dark-800/40 hover:bg-dark-700/60 backdrop-blur-md text-gray-400 hover:text-white rounded-full border border-dark-600/50 shadow-lg transition-all duration-300 flex items-center group"
          onClick={() => setIsFluidMode(!isFluidMode)}
        >
          <i className={`fas fa-palette mr-2 ${isFluidMode ? 'text-primary-400' : 'text-gray-500 group-hover:text-primary-400'} transition-colors`}></i>
          {isFluidMode ? "Go back to the plain background" : "Bored with the plain background?"}
        </button>
      </div>
    </div>
  )
}
