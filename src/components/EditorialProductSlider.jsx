import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { responsiveImageProps } from '../utils/productImages'

export default function EditorialProductSlider({ products = [] }) {
  const slides = useMemo(() => products
    .filter((product) => product.slideEnabled && product.slideTitle && product.slideSubtitle && product.images?.[0]?.url)
    .sort((a, b) => a.slideOrder - b.slideOrder)
    .slice(0, 4), [products])
  const [active, setActive] = useState(0)
  const visibleActive = slides.length ? active % slides.length : 0

  useEffect(() => {
    if (slides.length < 2) return undefined
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % slides.length), 4800)
    return () => window.clearTimeout(timer)
  }, [active, slides.length])

  if (!slides.length) return null

  function move(direction) {
    setActive((current) => (current + direction + slides.length) % slides.length)
  }

  return <section className="editorial-slider" aria-label="Selección destacada">
    <div className="editorial-slider-stage">
      {slides.map((slide, index) => <Link key={slide.id} to={`/producto/${slide.id}`} className={`editorial-slide${index === visibleActive ? ' is-active' : ''}`} aria-hidden={index !== visibleActive} tabIndex={index === visibleActive ? 0 : -1}>
        <img src={slide.images[0].url} alt={slide.images[0].alt || slide.name} loading={index === visibleActive ? 'eager' : 'lazy'} decoding="async" fetchPriority={index === visibleActive ? 'high' : 'low'} {...responsiveImageProps(slide.images[0], '100vw')} />
        <span className="editorial-slide-shade" />
        <div className="editorial-slide-copy">
          <h2>{slide.slideTitle}</h2>
          <p>{slide.slideSubtitle}</p>
        </div>
      </Link>)}
    </div>
    {slides.length > 1 && <div className="editorial-slider-arrows">
      <button type="button" onClick={() => move(-1)} aria-label="Diapositiva anterior">←</button>
      <button type="button" onClick={() => move(1)} aria-label="Diapositiva siguiente">→</button>
    </div>}
    {slides.length > 1 && <div className="editorial-slider-nav">{slides.map((slide, index) => <button key={slide.id} type="button" className={index === visibleActive ? 'is-active' : ''} onClick={() => setActive(index)} aria-label={`Ver diapositiva ${index + 1}`} />)}</div>}
  </section>
}
