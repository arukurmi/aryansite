import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import MetricCarousel from './MetricCarousel'

export default function CompanyProofCard({ company }) {
  const [slideIndex, setSlideIndex] = useState(0)

  return (
    <Card
      hover={false}
      className="flex flex-col h-full hover:-translate-y-1 hover:border-primary-500/40 hover:shadow-glow"
    >
      <CardHeader className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <i className={`${company.icon} text-white`}></i>
          </div>
          <div>
            <CardTitle className="text-primary-400 mb-0">{company.name}</CardTitle>
            <p className="text-gray-400 text-sm">{company.role}</p>
            <p className="text-gray-500 text-xs">{company.period}</p>
          </div>
        </div>
        <span className="text-gray-500 text-xs font-medium whitespace-nowrap mt-1">
          {slideIndex + 1} / {company.slides.length}
        </span>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <MetricCarousel slides={company.slides} onIndexChange={setSlideIndex} />
      </CardContent>
    </Card>
  )
}
