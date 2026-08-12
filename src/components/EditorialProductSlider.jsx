import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export default function EditorialProductSlider({ products = [] }) {
  const slides = useMemo(() => products
    .filter((product) => product.slideEnabled && product.slideTitle && product.slideSubtitle && product.images?.[0]?.url)
    .sort((a, b) => a.slideOrder - b.slideOrder)
    .slice(0, 4), [products])
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (active >= slides.length) setActive(0)
  }, [active, slides.length])

  useEffect(() => {
    if (paused || slides.length < 2) return undefined
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5200)
    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  if (!slides.length) return null

  return <section className="editorial-slider" aria-label="Selección destacada" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <div className="editorial-slider-stage">
      {slides.map((slide, index) => <Link key={slide.id} to={`/producto/${slide.id}`} className={`editorial-slide${index === active ? ' is-active' : ''}`} aria-hidden={index !== active} tabIndex={index === active ? 0 : -1}>
        <img src={slide.images[0].url} alt={slide.images[0].alt || slide.name} />
        <span className="editorial-slide-shade" />
        <div className="editorial-slide-copy">
          <h2>{slide.slideTitle}</h2>
          <p>{slide.slideSubtitle}</p>
        </div>
      </Link>)}
    </div>
    {slides.length > 1 && <div className="editorial-slider-nav">{slides.map((slide, index) => <button key={slide.id} type="button" className={index === active ? 'is-active' : ''} onClick={() => setActive(index)} aria-label={`Ver diapositiva ${index + 1}`} />)}</div>}
  </section>
}
