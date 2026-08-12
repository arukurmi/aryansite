import Header from './Header'
import Footer from './Footer'

export default function Layout({ children, className = '' }) {
  return (
    <div className={`min-h-screen bg-transparent transition-colors duration-300 ${className}`}>
      {/* Header */}
      <Header />

      {/* Main content renders visible from the first paint. It used to be
          held at opacity-0 until a mount effect flipped it, which meant the
          prerendered HTML was invisible until hydration finished — the LCP
          element on every page waited on JS, and a failed bundle left a
          blank page. Section-level entrance motion is Reveal's job. */}
      <main className="relative z-10">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
