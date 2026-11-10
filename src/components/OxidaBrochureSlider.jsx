import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import OxidaWordmark from './OxidaWordmark'
import heroImg from '../assets/oxida/brochure/hero.webp'
import detailImg from '../assets/oxida/brochure/detail.webp'
import woodImg from '../assets/oxida/brochure/wood.webp'
import glassImg from '../assets/oxida/brochure/glass.webp'
import matHierroImg from '../assets/oxida/brochure/mat_hierro.webp'
import matMaderaImg from '../assets/oxida/brochure/mat_madera.webp'
import matVidrioImg from '../assets/oxida/brochure/mat_vidrio.webp'
import './OxidaBrochureSlider.css'

const DURATION_MS = 6500

const SLIDES = [
  {
    id: 'hero',
    bg: heroImg,
    eyebrow: 'ARQUITECTURA · DISEÑO · EJECUCIÓN',
    title: (
      <>
        Las ideas toman <span className="ox-accent">forma.</span>
      </>
    ),
    description: 'Soluciones arquitectónicas a medida para espacios que buscan diferenciarse.',
    type: 'hero',
  },
  {
    id: 'materiales',
    bg: detailImg,
    eyebrow: '01 / MATERIALES',
    title: (
      <>
        Tres materiales.<br />
        <span className="ox-accent">Infinitas posibilidades.</span>
      </>
    ),
    description: 'Combinamos la fuerza del hierro, la calidez de la madera y la transparencia del vidrio para crear piezas con identidad.',
    type: 'materials',
    materials: [
      { name: 'HIERRO', image: matHierroImg, desc: 'Estructura & Rigor' },
      { name: 'MADERA', image: matMaderaImg, desc: 'Calidez & Textura' },
      { name: 'VIDRIO', image: matVidrioImg, desc: 'Luz & Amplitud' },
    ],
  },
  {
    id: 'soluciones',
    bg: glassImg,
    eyebrow: '02 / SOLUCIONES',
    title: (
      <>
        Diseñamos para <span className="ox-accent">cada proyecto.</span>
      </>
    ),
    type: 'solutions',
    items: [
      { num: '01', title: 'Puertas y divisores' },
      { num: '02', title: 'Barandas y cerramientos' },
      { num: '03', title: 'Mobiliario a medida' },
      { num: '04', halls: true, title: 'Halls y áreas comunes' },
      { num: '05', title: 'Amenities y parrilleros' },
      { num: '06', title: 'Desarrollos especiales' },
    ],
  },
  {
    id: 'proceso',
    bg: woodImg,
    eyebrow: '03 / NUESTRA FORMA DE TRABAJAR',
    title: (
      <>
        De la idea a la <span className="ox-accent">realidad.</span>
      </>
    ),
    description: 'Integramos diseño, definición técnica, fabricación e instalación en un mismo equipo. Menos coordinación entre proveedores, más coherencia en cada detalle.',
    type: 'process',
    steps: ['DISEÑO', 'DESARROLLO', 'FABRICACIÓN', 'INSTALACIÓN'],
  },
  {
    id: 'contacto',
    bg: heroImg,
    eyebrow: '04 / TRABAJEMOS JUNTOS',
    title: (
      <>
        Tu próximo proyecto merece <span className="ox-accent">algo distinto.</span>
      </>
    ),
    description: 'Colaboramos con estudios de arquitectura, constructoras y desarrolladores para transformar desafíos de diseño en soluciones construidas.',
    type: 'cta',
  },
]

export default function OxidaBrochureSlider({ id = 'experiencia' }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const requestRef = useRef(null)
  const startTimeRef = useRef(performance.now())
  const pausedTimeRef = useRef(0)
  const touchStartXRef = useRef(null)
  const containerRef = useRef(null)

  const goToSlide = useCallback((nextIndex) => {
    setActiveIndex((nextIndex + SLIDES.length) % SLIDES.length)
    startTimeRef.current = performance.now()
    setProgress(0)
  }, [])

  const nextSlide = useCallback(() => {
    goToSlide(activeIndex + 1)
  }, [activeIndex, goToSlide])

  const prevSlide = useCallback(() => {
    goToSlide(activeIndex - 1)
  }, [activeIndex, goToSlide])

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev
      if (next) {
        pausedTimeRef.current = performance.now() - startTimeRef.current
      } else {
        startTimeRef.current = performance.now() - pausedTimeRef.current
      }
      return next
    })
  }, [])

  // Auto-play timer loop with rAF
  useEffect(() => {
    startTimeRef.current = performance.now()
    setProgress(0)

    const animate = (now) => {
      if (!isPaused) {
        const elapsed = now - startTimeRef.current
        const ratio = Math.min(1, elapsed / DURATION_MS)
        setProgress(ratio * 100)

        if (ratio >= 1) {
          goToSlide(activeIndex + 1)
          return
        }
      }
      requestRef.current = requestAnimationFrame(animate)
    }

    requestRef.current = requestAnimationFrame(animate)

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [activeIndex, isPaused, goToSlide])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        nextSlide()
      } else if (e.key === 'ArrowLeft') {
        prevSlide()
      } else if (e.key === ' ' && document.activeElement === containerRef.current) {
        e.preventDefault()
        togglePause()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextSlide, prevSlide, togglePause])

  // Touch Swipe Handlers
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const deltaX = touchStartXRef.current - touchEndX
    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        nextSlide()
      } else {
        prevSlide()
      }
    }
    touchStartXRef.current = null
  }

  return (
    <section
      id={id}
      className="ox-brochure-stage"
      ref={containerRef}
      tabIndex={0}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Presentación interactiva de Óxida Studio"
    >
      {/* Slides */}
      {SLIDES.map((slide, idx) => {
        const isActive = idx === activeIndex
        return (
          <article
            key={slide.id}
            className={`ox-slide ${isActive ? 'is-active' : ''}`}
            aria-hidden={!isActive}
          >
            <div
              className="ox-photo"
              style={{ backgroundImage: `url(${slide.bg})` }}
            />
            <div className="ox-overlay" />

            <div className="ox-content">
              {slide.type === 'hero' && idx === 0 && (
                <div className="ox-logo-wrap">
                  <OxidaWordmark showByline={false} className="ox-hero-brand" />
                </div>
              )}

              <div className="ox-eyebrow">{slide.eyebrow}</div>

              {slide.type === 'hero' ? (
                <h1 className="ox-title">{slide.title}</h1>
              ) : (
                <h2 className="ox-title">{slide.title}</h2>
              )}

              {slide.description && <p className="ox-desc">{slide.description}</p>}

              {/* Materiales */}
              {slide.type === 'materials' && (
                <div className="ox-materials">
                  {slide.materials.map((mat) => (
                    <div
                      key={mat.name}
                      className="ox-mat-card"
                      style={{ backgroundImage: `url(${mat.image})` }}
                    >
                      <div className="ox-mat-card-body">
                        <span className="ox-mat-name">{mat.name}</span>
                        <small className="ox-mat-desc">{mat.desc}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Soluciones */}
              {slide.type === 'solutions' && (
                <div className="ox-grid">
                  {slide.items.map((item) => (
                    <div key={item.num} className="ox-grid-item">
                      <b>{item.num}</b>
                      <span>{item.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Proceso */}
              {slide.type === 'process' && (
                <div className="ox-process-block">
                  <div className="ox-line" />
                  <div className="ox-stepper">
                    {slide.steps.map((st, sIdx) => (
                      <span key={st} className="ox-step">
                        <strong>{st}</strong>
                        {sIdx < slide.steps.length - 1 && <em aria-hidden="true">→</em>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              {slide.type === 'cta' && (
                <div className="ox-cta-block">
                  <div className="ox-cta-buttons">
                    <a
                      href="https://wa.me/59899000000?text=Hola%20Oxida%20Studio%2C%20quisiera%20cotizar%20un%20proyecto"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ox-cta-button ox-cta-button--primary"
                    >
                      COTIZAR PROYECTO A MEDIDA ↗
                    </a>
                    <Link to="/cliente/login" className="ox-cta-button ox-cta-button--secondary">
                      PORTAL DE OBRA OxI ⚡
                    </Link>
                  </div>
                  <p className="ox-contact-line">
                    contacto@mercadobra.com · Montevideo, Uruguay
                  </p>
                  <p className="ox-note">
                    Soluciones integrales de diseño técnico y ejecución en hierro, madera y vidrio.
                  </p>
                </div>
              )}
            </div>
          </article>
        )
      })}

      {/* Top indicator pills */}
      <div className="ox-top-nav" aria-label="Selector de diapositiva">
        {SLIDES.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            className={`ox-pill-nav ${idx === activeIndex ? 'is-active' : ''}`}
            onClick={() => goToSlide(idx)}
            aria-label={`Ir a diapositiva ${idx + 1}`}
          >
            <span>0{idx + 1}</span>
          </button>
        ))}
      </div>

      {/* Bottom Footer Controls */}
      <footer className="ox-footer">
        <span className="ox-count">
          {String(activeIndex + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </span>

        <div className="ox-track" title="Progreso de diapositiva">
          <div className="ox-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="ox-controls">
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Diapositiva anterior"
            className="ox-btn"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={togglePause}
            aria-label={isPaused ? 'Reanudar presentación' : 'Pausar presentación'}
            className="ox-btn"
          >
            {isPaused ? '▶' : 'Ⅱ'}
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Diapositiva siguiente"
            className="ox-btn"
          >
            ›
          </button>
        </div>
      </footer>
    </section>
  )
}
