export default function Spinner({ size = 24 }) {
  return (
    <div className="spinner" style={{ '--spinner-size': `${size}px` }}>
      <svg viewBox="0 0 50 50" width={size} height={size} aria-hidden="true">
        <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 94.2" />
      </svg>
    </div>
  )
}
