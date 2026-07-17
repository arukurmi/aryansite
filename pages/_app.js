import '../styles/globals.css'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Analytics } from '@vercel/analytics/next'
import SkyBackground from '../components/ui/SkyBackground'
import FluidBackground from '../components/ui/FluidBackground'
import BackgroundToggle from '../components/ui/BackgroundToggle'

const FLUID_KEY = 'fluid-background'
// Offset so anchored sections clear the fixed header instead of hiding under it.
const HEADER_OFFSET = 88

export default function App({ Component, pageProps }) {
  const router = useRouter()
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

  // Smooth-scroll to in-page anchors (footer/header "Contact", "Subscribe",
  // etc.). The links set scroll={false} so we own the scroll here — landing on
  // the section with a header offset instead of jumping to the top.
  useEffect(() => {
    const scrollToHash = (url) => {
      const hash = url.split('#')[1]
      if (!hash) return
      // Wait for the destination page to paint before measuring.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const el = document.getElementById(hash)
          if (!el) return
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
          window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
        })
      )
    }

    router.events.on('routeChangeComplete', scrollToHash)
    router.events.on('hashChangeComplete', scrollToHash)
    return () => {
      router.events.off('routeChangeComplete', scrollToHash)
      router.events.off('hashChangeComplete', scrollToHash)
    }
  }, [router])

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
