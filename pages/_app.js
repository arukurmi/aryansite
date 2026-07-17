import '../styles/globals.css'
import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import SkyBackground from '../components/ui/SkyBackground'
import FluidBackground from '../components/ui/FluidBackground'
import BackgroundToggle from '../components/ui/BackgroundToggle'

const FLUID_KEY = 'fluid-background'

export default function App({ Component, pageProps }) {
  const [isFluidMode, setIsFluidMode] = useState(false)

  // Restore the visitor's background choice once, on first mount, so it stays
  // constant as they navigate between pages instead of resetting each time.
  useEffect(() => {
    setIsFluidMode(window.localStorage.getItem(FLUID_KEY) === 'on')
  }, [])

  const toggleFluid = () => {
    setIsFluidMode((on) => {
      const next = !on
      window.localStorage.setItem(FLUID_KEY, next ? 'on' : 'off')
      return next
    })
  }

  return (
    <>
      {/* Ambient backgrounds render once here — not inside per-page Layout — so
          they persist unbroken across navigations. */}
      <SkyBackground />
      {isFluidMode && <FluidBackground />}

      <Component {...pageProps} />

      <BackgroundToggle isFluidMode={isFluidMode} onToggle={toggleFluid} />
      <Analytics />
    </>
  )
}
