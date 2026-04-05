export function SkeletonCard() {
  return (
    <article className="skeleton-card">
      <div className="skeleton-img"></div>
      <div className="skeleton-badge"></div>
      <div className="skeleton-text skeleton-text--short"></div>
      <div className="skeleton-text"></div>
      <div className="skeleton-text skeleton-text--short"></div>
    </article>
  )
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="products-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
