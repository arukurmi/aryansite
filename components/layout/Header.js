import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/#about' },
    { name: 'Experience', href: '/#experience' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/#contact' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-md border-b border-dark-700">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="text-white font-bold text-lg">AK</span>
            </div>
            <span className="text-white font-bold text-xl group-hover:text-primary-400 transition-colors duration-300">
              Aryansh Kurmi
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-300 hover:text-primary-400 font-medium transition-colors duration-300 relative group"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-500 group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <a
              href="https://drive.google.com/file/d/1886vZeTRqPPvchbldM-3D5KE_KChNOs1/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm px-4 py-2"
            >
              <i className="fas fa-file-alt mr-2"></i>
              Resume
            </a>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white hover:text-primary-400 transition-colors duration-300"
          >
            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
          </button>
        </div>

        <div className={`md:hidden transition-all duration-300 ${
          isMobileMenuOpen 
            ? 'max-h-96 opacity-100' 
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className="py-4 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-gray-300 hover:text-primary-400 font-medium transition-colors duration-300 py-2"
              >
                {item.name}
              </Link>
            ))}
            <a
              href="https://drive.google.com/file/d/1886vZeTRqPPvchbldM-3D5KE_KChNOs1/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="block btn-primary text-sm px-4 py-2 w-fit"
            >
              <i className="fas fa-file-alt mr-2"></i>
              Resume
            </a>
          </div>
        </div>
      </nav>
    </header>
  )
}
