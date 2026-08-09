import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import { useWishlist } from '../context/WishlistContext'
import ProductCard from '../components/ProductCard'
import EmptyState from '../components/EmptyState'
import '../styles/Wishlist.css'

export default function Wishlist() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { productList } = useProducts()
  const { wishlist, addToWishlist } = useWishlist()
  const [shareStatus, setShareStatus] = useState('')

  const wishlistProducts = productList.filter((p) => wishlist.includes(p.id))

  const shareLink = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const ids = wishlist.join(',')
    return `${window.location.origin}/favoritos${ids ? `?items=${encodeURIComponent(ids)}` : ''}`
  }, [wishlist])

  useEffect(() => {
    const sharedItems = searchParams.get('items')
    if (!sharedItems) return

    const ids = sharedItems
      .split(',')
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value))

    ids.forEach((id) => addToWishlist(id))
    if (ids.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShareStatus(`Se importaron ${ids.length} favorito${ids.length === 1 ? '' : 's'} desde el link.`)
      window.setTimeout(() => setShareStatus(''), 2600)
    }
  }, [searchParams, addToWishlist])

  async function handleShareWishlist() {
    if (!shareLink) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mis favoritos de Mercadobra',
          text: 'Mirá estos productos que guardé en Mercadobra.',
          url: shareLink,
        })
        setShareStatus('Wishlist compartida.')
        window.setTimeout(() => setShareStatus(''), 2000)
        return
      } catch {
        // fallback to clipboard below
      }
    }

    try {
      await navigator.clipboard.writeText(shareLink)
      setShareStatus('Link copiado al portapapeles.')
    } catch {
      setShareStatus('No se pudo copiar el link.')
    }
    window.setTimeout(() => setShareStatus(''), 2400)
  }

  return (
    <section className="section wishlist-section" id="wishlist">
      <div className="wishlist-container">
        <div className="wishlist-header">
          <div>
            <h1 className="wishlist-title">Mis Favoritos</h1>
            <p className="wishlist-subtitle">{wishlist.length} producto{wishlist.length !== 1 ? 's' : ''} guardado{wishlist.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn-secondary" onClick={() => navigate('/explorar')}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M9 5L2 12m0 0l7 7m-7-7h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            Seguir explorando
          </button>
        </div>

        <div className="wishlist-tools">
          <button type="button" className="btn-primary" onClick={handleShareWishlist} disabled={!wishlist.length}>
            Compartir wishlist
          </button>
          {shareStatus && <p className="wishlist-share-status">{shareStatus}</p>}
        </div>

        {wishlistProducts.length === 0 ? (
          <EmptyState
            icon="♡"
            title="Sin favoritos aún"
            message="Agrega productos a tus favoritos para guardarlos aquí y acceder rápidamente a ellos."
            action={
              <button className="btn-primary" onClick={() => navigate('/explorar')}>
                Explorar productos
              </button>
            }
          />
        ) : (
          <div className="products-grid">
            {wishlistProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
