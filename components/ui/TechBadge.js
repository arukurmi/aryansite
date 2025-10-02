import { forwardRef } from 'react'

const TechBadge = forwardRef(({ 
  children, 
  variant = 'default',
  size = 'md',
  className = '', 
  ...props 
}, ref) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-all duration-300 hover:scale-105'
  
  const variants = {
    default: 'bg-dark-700 text-primary-300 border border-dark-600 hover:border-primary-500 hover:shadow-glow',
    primary: 'bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
  }
  
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }
  
  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`
  
  return (
    <span
      ref={ref}
      className={classes}
      {...props}
    >
      {children}
    </span>
  )
})

TechBadge.displayName = 'TechBadge'

export default TechBadge
