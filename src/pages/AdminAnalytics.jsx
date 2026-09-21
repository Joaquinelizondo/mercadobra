import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAdminAnalytics } from '../lib/api'
import { formatPrice } from '../utils/format'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import OxidaWordmark from '../components/OxidaWordmark'
import './AdminAnalytics.css'

export default function AdminAnalytics() {
  const { adminUser, adminToken } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!adminToken) return
    getAdminAnalytics(adminToken)
      .then(res => setData(res.metrics))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [adminToken])

  if (!adminUser || !adminToken) return <Navigate to="/admin/login?redirect=/admin/analitica" replace />

  return (
    <section className="analytics-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Métricas Comerciales</span>
          <h1 style={{ margin: '0.5rem 0 0', fontSize: '2rem', color: '#1a1a1a' }}>Analítica & Rendimiento</h1>
        </div>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/admin/cotizaciones-clientes" style={{ color: '#ea580c', textDecoration: 'none', fontWeight: '500' }}>← Volver a Cotizaciones</Link>
        </nav>
      </header>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {loading && <p>Cargando datos...</p>}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
            <div style={{ background: '#f8f5ef', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#666' }}>Volumen Ganado (USD)</h3>
              <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: '#16a34a' }}>{formatPrice(data.revenue.USD, 'USD')}</p>
            </div>
            <div style={{ background: '#f8f5ef', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#666' }}>Volumen Ganado (UYU)</h3>
              <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: '#16a34a' }}>{formatPrice(data.revenue.UYU, 'UYU')}</p>
            </div>
            <div style={{ background: '#f8f5ef', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#666' }}>Cotizaciones Aceptadas</h3>
              <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>{data.statusCounts.accepted + data.statusCounts.project_in_progress + data.statusCounts.completed}</p>
            </div>
            <div style={{ background: '#f8f5ef', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#666' }}>Cotizaciones en Proceso</h3>
              <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: '#ea580c' }}>{data.statusCounts.in_progress}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e5e5e5' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#1a1a1a' }}>Evolución de Cotizaciones (Histórico)</h2>
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#666'}} dx={-10} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="Totales" stroke="#8884d8" strokeWidth={3} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="Aceptadas" stroke="#16a34a" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
