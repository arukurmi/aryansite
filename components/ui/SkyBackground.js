// Site-wide sky backdrop: night (default) with stars, moon and faint gray
// clouds; day (.light on <html>) with sun glow and white clouds. Pure CSS —
// theme switching happens via .light overrides in globals.css, no JS reads.

// Deterministic pseudo-random so SSR and client render identical stars.
const rand = (i, salt) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const STARS = [...Array(70)].map((_, i) => ({
  left: rand(i, 1) * 100,
  top: rand(i, 2) * 100,
  size: rand(i, 3) > 0.75 ? 2.5 : 1.5,
  delay: rand(i, 4) * 6,
  duration: 3 + rand(i, 5) * 4,
}))

const CLOUDS = [
  // layer 1 — far, slow, small
  { top: '8%', scale: 0.6, duration: 220, delay: -40, layer: 1 },
  { top: '30%', scale: 0.5, duration: 260, delay: -160, layer: 1 },
  { top: '55%', scale: 0.55, duration: 240, delay: -90, layer: 1 },
  // layer 2 — mid
  { top: '15%', scale: 0.9, duration: 160, delay: -20, layer: 2 },
  { top: '45%', scale: 0.8, duration: 180, delay: -120, layer: 2 },
  { top: '70%', scale: 0.85, duration: 170, delay: -70, layer: 2 },
  // layer 3 — near, faster, large
  { top: '25%', scale: 1.3, duration: 110, delay: -30, layer: 3 },
  { top: '60%', scale: 1.2, duration: 120, delay: -85, layer: 3 },
]

function Cloud({ style, className }) {
  return (
    <svg viewBox="0 0 200 60" width="200" height="60" className={className} style={style} aria-hidden="true">
      <g>
        <ellipse cx="50" cy="42" rx="40" ry="16" />
        <ellipse cx="95" cy="34" rx="45" ry="20" />
        <ellipse cx="145" cy="42" rx="42" ry="15" />
        <ellipse cx="80" cy="24" rx="28" ry="14" />
        <ellipse cx="118" cy="22" rx="24" ry="12" />
      </g>
    </svg>
  )
}

export default function SkyBackground() {
  return (
    <div className="sky" aria-hidden="true">
      {/* Night layer */}
      <div className="sky-night">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="sky-star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
        <div className="sky-moon" />
      </div>

      {/* Day layer */}
      <div className="sky-day">
        <div className="sky-sun" />
      </div>

      {/* Clouds — shared, recolored per theme via CSS */}
      {CLOUDS.map((c, i) => (
        <Cloud
          key={i}
          className={`sky-cloud sky-cloud-l${c.layer}`}
          style={{
            top: c.top,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
            '--cloud-scale': c.scale,
          }}
        />
      ))}
    </div>
  )
}
