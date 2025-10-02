import { forwardRef } from 'react'

const Card = forwardRef(({ 
  children, 
  className = '', 
  hover = true,
  glow = false,
  ...props 
}, ref) => {
  const baseClasses = 'bg-dark-800/50 backdrop-blur-sm border border-dark-700 rounded-xl p-6 shadow-xl transition-all duration-300'
  const hoverClasses = hover ? 'hover:scale-105 hover:shadow-glow' : ''
  const glowClasses = glow ? 'shadow-glow' : ''
  
  const classes = `${baseClasses} ${hoverClasses} ${glowClasses} ${className}`
  
  return (
    <div
      ref={ref}
      className={classes}
      {...props}
    >
      {children}
    </div>
  )
})

Card.displayName = 'Card'

const CardHeader = forwardRef(({ children, className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`mb-4 ${className}`}
    {...props}
  >
    {children}
  </div>
))

CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef(({ children, className = '', ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-xl font-bold text-white mb-2 ${className}`}
    {...props}
  >
    {children}
  </h3>
))

CardTitle.displayName = 'CardTitle'

const CardContent = forwardRef(({ children, className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`text-gray-300 ${className}`}
    {...props}
  >
    {children}
  </div>
))

CardContent.displayName = 'CardContent'

const CardFooter = forwardRef(({ children, className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`mt-4 pt-4 border-t border-dark-700 ${className}`}
    {...props}
  >
    {children}
  </div>
))

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardContent, CardFooter }
