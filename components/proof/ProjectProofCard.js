import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card'

export default function ProjectProofCard({ project }) {
  const [activeShot, setActiveShot] = useState(0)
  const shots = project.screenshots

  return (
    <Card hover={false} className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-primary-400">{project.name}</CardTitle>
        <p className="text-white font-semibold">{project.tagline}</p>
      </CardHeader>

      <CardContent className="flex flex-col flex-1">
        {shots && (
          <div className="mb-4">
            <div className="relative aspect-video rounded-lg border border-dark-700 overflow-hidden bg-dark-800">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={shots[activeShot].src}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={shots[activeShot].src}
                    alt={shots[activeShot].alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover object-top"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex gap-2 mt-2">
              {shots.map((shot, i) => (
                <button
                  key={shot.src}
                  onClick={() => setActiveShot(i)}
                  aria-label={`View screenshot: ${shot.alt}`}
                  className={`relative aspect-video w-16 rounded border overflow-hidden transition-colors duration-300 ${
                    i === activeShot ? 'border-primary-500' : 'border-dark-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={shot.src} alt={shot.alt} fill sizes="64px" className="object-cover object-top" />
                </button>
              ))}
            </div>
          </div>
        )}

        <ul className="text-gray-400 text-sm space-y-2">
          {project.proofPoints.map((point, i) => (
            <li key={i} className="flex items-start">
              <i className="fas fa-check text-primary-400 mr-2 mt-1 text-xs"></i>
              {point}
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="flex items-center gap-4">
        {project.links.live && (
          <a
            href={project.links.live}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm px-4 py-2"
          >
            <i className="fas fa-external-link-alt mr-2"></i>
            View Live
          </a>
        )}
        {project.links.github && (
          <a
            href={project.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-primary-400 font-medium text-sm transition-colors duration-300"
          >
            <i className="fab fa-github mr-2"></i>
            GitHub
          </a>
        )}
      </CardFooter>
    </Card>
  )
}
