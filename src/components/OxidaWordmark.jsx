export default function OxidaWordmark({ className = '', showByline = false }) {
  return (
    <div className={`oxida-wordmark ${className}`.trim()} aria-label="Óxida Studio">
      <div className="oxida-wordmark-name" aria-hidden="true">
        <span>OXI</span><span className="oxida-wordmark-rust">D</span><span>A</span>
      </div>
      <span className="oxida-wordmark-line" aria-hidden="true" />
      <div className="oxida-wordmark-studio" aria-hidden="true">STUDIO</div>
      {showByline && <span className="oxida-wordmark-byline">by Mercadobra</span>}
    </div>
  )
}
