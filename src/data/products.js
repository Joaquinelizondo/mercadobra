import cama from '../assets/oxida/cama-hierro.jpeg'
import casa from '../assets/oxida/casa.jpeg'
import entrada from '../assets/oxida/entrada.jpeg'
import escalera from '../assets/oxida/escalera.jpeg'
import estante from '../assets/oxida/estante.jpeg'
import estanteria from '../assets/oxida/estanteria.jpeg'

export const CARD_COLORS = ['#a8522e', '#23231f', '#75675c', '#b96a43', '#47443e', '#c2a17e']

export const INITIAL_PRODUCTS = [
  {
    id: 1, name: 'Escalera Línea Nexo', company: 'Oxida Studio', category: 'Escaleras y barandas',
    price: 2850, currency: 'USD', unit: 'proyecto', stock: 4,
    description: 'Escalera de estructura metálica y peldaños de madera. Adaptable a tu espacio.',
    color: '#23231f', images: [{ url: escalera, alt: 'Escalera Línea Nexo en hierro y madera' }],
    deliveryDays: 30,
  },
  {
    id: 2, name: 'Cama Hierro Serena', company: 'Oxida Studio', category: 'Mobiliario',
    price: 890, currency: 'USD', unit: 'unidad', stock: 6,
    description: 'Estructura liviana de hierro con terminación mate. Disponible en tres medidas.',
    color: '#a8522e', images: [{ url: cama, alt: 'Cama Serena de hierro' }],
    deliveryDays: 18,
  },
  {
    id: 3, name: 'Divisor Trama', company: 'Oxida Studio', category: 'Fachadas y divisores',
    price: 640, currency: 'USD', unit: 'm²', stock: 3,
    description: 'Panel metálico modular para dividir y dar privacidad sin perder luz.',
    color: '#75675c', images: [{ url: entrada, alt: 'Divisor metálico Trama' }],
    deliveryDays: 25,
  },
  {
    id: 4, name: 'Pérgola Umbral', company: 'Oxida Studio', category: 'Estructuras',
    price: 3200, currency: 'USD', unit: 'proyecto', stock: 2,
    description: 'Estructura exterior en acero, diseñada y fabricada según cada espacio.',
    color: '#47443e', images: [{ url: casa, alt: 'Pérgola Umbral de acero' }],
    deliveryDays: 35,
  },
  {
    id: 5, name: 'Estante Mínimo', company: 'Oxida Studio', category: 'Mobiliario',
    price: 180, currency: 'USD', unit: 'unidad', stock: 12,
    description: 'Estante de hierro y madera con fijaciones ocultas. Simple, firme y versátil.',
    color: '#b96a43', images: [{ url: estante, alt: 'Estante Mínimo en hierro y madera' }],
    deliveryDays: 12,
  },
  {
    id: 6, name: 'Biblioteca Sistema 01', company: 'Oxida Studio', category: 'Mobiliario',
    price: 1250, currency: 'USD', unit: 'unidad', stock: 5,
    description: 'Sistema modular de guardado con estructura metálica y estantes de madera.',
    color: '#c2a17e', images: [{ url: estanteria, alt: 'Biblioteca modular Sistema 01' }],
    deliveryDays: 22,
  },
]
