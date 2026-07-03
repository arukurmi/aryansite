import { useEffect, useState } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'

const W = 320
const H = 160
const PAD = { top: 24, right: 16, bottom: 24, left: 16 }

const PRIMARY = '#3b82f6'
const PRIMARY_LIGHT = '#60a5fa'

// Bars are plain <rect>s with final geometry, animated via the .chart-bar CSS
// scaleY keyframe (framer-motion treats SVG x/y as transforms, which breaks
// attribute positioning). Text/labels still use framer opacity fades.

function ChartDefs({ idPrefix }) {
  return (
    <defs>
      <linearGradient id={`${idPrefix}-fill`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PRIMARY} stopOpacity="0.45" />
        <stop offset="100%" stopColor={PRIMARY} stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${idPrefix}-bar`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor={PRIMARY} />
        <stop offset="100%" stopColor={PRIMARY_LIGHT} />
      </linearGradient>
      <filter id={`${idPrefix}-glow`} x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={PRIMARY} floodOpacity="0.6" />
      </filter>
    </defs>
  )
}

function CountUp({ to, unit = '', decimals = 0, className = '' }) {
  const value = useMotionValue(0)
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    const controls = animate(value, to, { duration: 1.2, ease: 'easeOut' })
    const unsub = value.on('change', (v) => setDisplay(v.toFixed(decimals)))
    return () => {
      controls.stop()
      unsub()
    }
  }, [to, decimals, value])

  return (
    <span className={className}>
      {display}
      {unit}
    </span>
  )
}

function AreaChart({ chart, idPrefix }) {
  const { data, unit = '' } = chart
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const points = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * innerW,
    y: PAD.top + innerH - ((d.value - min) / range) * innerH,
    label: d.label,
    value: d.value,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${H - PAD.bottom} L${points[0].x},${H - PAD.bottom} Z`
  const last = points[points.length - 1]
  const first = points[0]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label={`Trend from ${first.value}${unit} to ${last.value}${unit}`}>
      <ChartDefs idPrefix={idPrefix} />
      <line className="chart-axis" x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} strokeWidth="1" />
      <motion.path
        d={areaPath}
        fill={`url(#${idPrefix}-fill)`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
      <motion.path
        d={linePath}
        fill="none"
        stroke={PRIMARY}
        strokeWidth="2.5"
        strokeLinecap="round"
        filter={`url(#${idPrefix}-glow)`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      {points.map((p) => (
        <text key={p.label} className="chart-faint-label" x={p.x} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="9">
          {p.label}
        </text>
      ))}
      <text className="chart-muted-label" x={first.x} y={first.y - 8} textAnchor="start" fontSize="10">
        {first.value}{unit}
      </text>
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.3 }}>
        <circle cx={last.x} cy={last.y} r="4.5" fill={PRIMARY_LIGHT} filter={`url(#${idPrefix}-glow)`} />
        <text className="chart-value" x={last.x} y={last.y - 10} textAnchor="end" fontSize="12" fontWeight="700">
          {last.value}{unit}
        </text>
      </motion.g>
    </svg>
  )
}

function BarsChart({ chart, idPrefix }) {
  const { data, unit = '', delta } = chart
  const max = Math.max(...data.map((d) => d.value))
  const innerH = H - PAD.top - PAD.bottom
  const barW = 64
  const gap = 72
  const startX = W / 2 - (data.length * barW + (data.length - 1) * gap) / 2 + 8
  const minBarH = 6 // keep tiny "after" values visible

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}${unit}`).join(', ')}>
      <ChartDefs idPrefix={idPrefix} />
      <line className="chart-axis" x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} strokeWidth="1" />
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * innerH, minBarH)
        const x = startX + i * (barW + gap)
        const y = H - PAD.bottom - barH
        const isAfter = i === data.length - 1
        return (
          <g key={d.label}>
            <rect
              className={isAfter ? 'chart-bar' : 'chart-bar chart-bar-before'}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="4"
              fill={isAfter ? `url(#${idPrefix}-bar)` : undefined}
              filter={isAfter ? `url(#${idPrefix}-glow)` : undefined}
              style={{ animationDelay: `${i * 0.25}s` }}
            />
            <motion.text
              className={isAfter ? 'chart-value' : 'chart-muted-label'}
              x={x + barW / 2}
              y={y - 8}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.25 + 0.7 }}
            >
              {d.value}{unit}
            </motion.text>
            <text className="chart-faint-label" x={x + barW / 2} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="9">
              {d.label}
            </text>
          </g>
        )
      })}
      {delta && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
          <rect x={W / 2 - 26} y={PAD.top - 14} width="52" height="20" rx="10" fill={PRIMARY} fillOpacity="0.15" stroke={PRIMARY} strokeOpacity="0.5" />
          <text className="chart-value" x={W / 2} y={PAD.top} textAnchor="middle" fontSize="11" fontWeight="700">
            {delta}
          </text>
        </motion.g>
      )}
    </svg>
  )
}

function GrowthChart({ chart, idPrefix }) {
  const { data, unit = '' } = chart
  const max = Math.max(...data.map((d) => d.value))
  const innerH = H - PAD.top - PAD.bottom
  const barW = 56
  const gap = 40
  const startX = W / 2 - (data.length * barW + (data.length - 1) * gap) / 2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}${unit}`).join(', ')}>
      <ChartDefs idPrefix={idPrefix} />
      <line className="chart-axis" x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} strokeWidth="1" />
      {data.map((d, i) => {
        const barH = (d.value / max) * innerH
        const x = startX + i * (barW + gap)
        const y = H - PAD.bottom - barH
        const isLast = i === data.length - 1
        return (
          <g key={d.label}>
            <rect
              className="chart-bar"
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="4"
              fill={isLast ? `url(#${idPrefix}-bar)` : PRIMARY}
              fillOpacity={isLast ? 1 : 0.35 + i * 0.2}
              filter={isLast ? `url(#${idPrefix}-glow)` : undefined}
              style={{ animationDelay: `${i * 0.2}s` }}
            />
            <motion.text
              className={isLast ? 'chart-value' : 'chart-muted-label'}
              x={x + barW / 2}
              y={y - 8}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.2 + 0.6 }}
            >
              {d.value}{unit}{isLast ? '+' : ''}
            </motion.text>
            <text className="chart-faint-label" x={x + barW / 2} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="9">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function ProgressChart({ chart }) {
  const { data, unit = '' } = chart

  return (
    <div className="w-full h-full flex flex-col justify-center gap-5 px-2" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}${unit}`).join(', ')}>
      {data.map((d, i) => (
        <div key={d.label}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-gray-400 text-xs">{d.label}</span>
            <CountUp to={d.value} unit={unit} className="text-primary-400 text-sm font-bold" />
          </div>
          <div className="h-3 rounded-full bg-dark-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 shadow-glow"
              initial={{ width: 0 }}
              animate={{ width: `${d.value}%` }}
              transition={{ duration: 1.2, delay: i * 0.2, ease: 'easeOut' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MetricChart({ chart, idPrefix = 'chart' }) {
  switch (chart.type) {
    case 'area':
      return <AreaChart chart={chart} idPrefix={idPrefix} />
    case 'bars':
      return <BarsChart chart={chart} idPrefix={idPrefix} />
    case 'growth':
      return <GrowthChart chart={chart} idPrefix={idPrefix} />
    case 'progress':
      return <ProgressChart chart={chart} />
    default:
      return null
  }
}
