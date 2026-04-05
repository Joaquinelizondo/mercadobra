export default function Rating({ value, max = 5, size = 'md', showValue = true }) {
  const sizeClass = `rating-${size}`
  const fullStars = Math.floor(value)
  const halfStar = value % 1 >= 0.5

  return (
    <div className={`rating ${sizeClass}`}>
      <div className="rating-stars">
        {[...Array(max)].map((_, i) => {
          let starClass = 'rating-star'
          if (i < fullStars) {
            starClass += ' rating-star--filled'
          } else if (i === fullStars && halfStar) {
            starClass += ' rating-star--half'
          }
          return (
            <span key={i} className={starClass} aria-hidden="true">
              ★
            </span>
          )
        })}
      </div>
      {showValue && <span className="rating-value">{value}</span>}
    </div>
  )
}
