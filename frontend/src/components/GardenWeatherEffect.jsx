import { useEffect, useRef, useState } from 'react'

const dropPositions = [3, 8, 14, 19, 25, 31, 37, 43, 48, 53, 58, 64, 69, 74, 80, 85, 91, 97]

export default function GardenWeatherEffect({ effect }) {
  const layer = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting)
    })
    observer.observe(layer.current)
    return () => observer.disconnect()
  }, [])

  return <div ref={layer} aria-hidden="true"
    className={`garden-weather-effect garden-effect-${effect}${visible ? ' garden-effect-visible' : ''}`}>
    {(effect === 'rain' || effect === 'snow') && dropPositions.map((position, index) => <span
      className="garden-weather-particle" key={position} style={{
        '--particle-x': `${position}%`,
        '--particle-y': `${(index * 37) % 97}%`,
        '--particle-delay': `${-((index * 37) % 97) / 100}s`,
        '--particle-duration': `${(effect === 'rain' ? 1.75 : 5) + (index % 4) * 0.35}s`,
        '--particle-size': `${effect === 'rain' ? 13 + (index % 3) * 5 : 3 + index % 3}px`,
      }} />)}
    {(effect === 'clouds' || effect === 'rain' || effect === 'snow' || effect === 'fog') && <>
      <span className="garden-sky-cloud garden-sky-cloud-first" />
      <span className="garden-sky-cloud garden-sky-cloud-second" />
      <span className="garden-sky-cloud garden-sky-cloud-third" />
    </>}
    {effect === 'night' && <span className="garden-sky-moon" />}
  </div>
}
