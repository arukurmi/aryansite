import { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only render after mounting to avoid SSR issues
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder during SSR
    return (
      <div className="w-14 h-7 bg-dark-700 rounded-full p-1">
        <div className="w-5 h-5 bg-white rounded-full"></div>
      </div>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 bg-dark-700 dark:bg-dark-600 rounded-full p-1 transition-colors duration-300 hover:bg-dark-600 dark:hover:bg-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      aria-label="Toggle theme"
    >
      <div
        className={`absolute w-5 h-5 bg-white dark:bg-primary-500 rounded-full shadow-md transform transition-all duration-300 flex items-center justify-center ${
          theme === 'dark' ? 'translate-x-0' : 'translate-x-7'
        }`}
      >
        {theme === 'dark' ? (
          <i className="fas fa-moon text-xs text-dark-900"></i>
        ) : (
          <i className="fas fa-sun text-xs text-yellow-500"></i>
        )}
      </div>
    </button>
  )
}
