import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MetricChart from './MetricChart'

const variants = {
  enter: (direction) => ({ x: direction > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -48 : 48, opacity: 0 }),
}

export default function MetricCarousel({ slides, onIndexChange }) {
  const [[index, direction], setState] = useState([0, 0])
  const slide = slides[index]

  const paginate = useCallback(
    (dir) => {
      setState(([i]) => {
        const next = (i + dir + slides.length) % slides.length
        if (onIndexChange) onIndexChange(next)
        return [next, dir]
      })
    },
    [slides.length, onIndexChange]
  )

  const handleDragEnd = (_, info) => {
    if (info.offset.x < -60) paginate(1)
    else if (info.offset.x > 60) paginate(-1)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative overflow-hidden flex-1 min-h-[440px]">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className="cursor-grab active:cursor-grabbing"
          >
            <p className="text-gray-400 text-sm font-medium mb-1">{slide.title}</p>
            <div className="flex items-baseline gap-2 mb-4 flex-wrap">
              <span className="gradient-text text-4xl font-bold">{slide.metric}</span>
              <span className="text-gray-400 text-sm">{slide.metricLabel}</span>
            </div>

            <div className="rounded-lg border border-dark-700 bg-dark-800/50 px-3 py-2 mb-4 h-44">
              <MetricChart chart={slide.chart} idPrefix={slide.id} />
            </div>

            <p className="text-gray-400 text-sm leading-relaxed mb-4">{slide.narrative}</p>

            {slide.stats && (
              <div className="flex flex-wrap gap-2 mb-2">
                {slide.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-dark-700 bg-dark-800/50 px-3 py-1.5 text-center"
                  >
                    <span className="text-primary-400 text-sm font-bold mr-1.5">{stat.value}</span>
                    <span className="text-gray-500 text-xs">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}

            {slide.approximate && (
              <p className="text-gray-600 text-xs italic">~ baseline approximate / illustrative</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-dark-700">
        <button
          onClick={() => paginate(-1)}
          aria-label="Previous metric"
          className="w-9 h-9 rounded-full border border-dark-700 text-gray-400 hover:text-primary-400 hover:border-primary-500 transition-colors duration-300 flex items-center justify-center"
        >
          <i className="fas fa-chevron-left text-sm"></i>
        </button>

        <div className="flex items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setState(([cur]) => {
                if (onIndexChange) onIndexChange(i)
                return [i, i > cur ? 1 : -1]
              })}
              aria-label={`Go to metric ${i + 1}: ${s.title}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-primary-500' : 'w-2 bg-dark-600 hover:bg-dark-500'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => paginate(1)}
          aria-label="Next metric"
          className="w-9 h-9 rounded-full border border-dark-700 text-gray-400 hover:text-primary-400 hover:border-primary-500 transition-colors duration-300 flex items-center justify-center"
        >
          <i className="fas fa-chevron-right text-sm"></i>
        </button>
      </div>
    </div>
  )
}
