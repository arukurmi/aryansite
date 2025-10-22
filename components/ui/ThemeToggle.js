import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Get theme from localStorage or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.documentElement.classList.toggle('light', savedTheme === 'light')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('light', newTheme === 'light')
  }

  if (!mounted) {
    // Return a placeholder during SSR
    return (
      <button className="w-10 h-10 rounded-full bg-dark-700 hover:bg-dark-600 transition-colors duration-300 flex items-center justify-center">
        <i className="fas fa-moon text-white text-sm"></i>
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-full bg-dark-700 hover:bg-dark-600 transition-all duration-300 flex items-center justify-center group"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <i className="fas fa-moon text-white text-sm group-hover:text-primary-400 transition-colors duration-300"></i>
      ) : (
        <i className="fas fa-sun text-yellow-400 text-sm group-hover:text-yellow-300 transition-colors duration-300"></i>
      )}
    </button>
  )
}