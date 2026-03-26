export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; 
  imageUrl: string;
  isActive: boolean;
  category: string;
}

export const mockProducts: Product[] = [
  {
    id: 'prod_001',
    name: 'Entremet de Maracuyá',
    description: 'Postre por capas con mousse de maracuyá, bizcocho de almendras y glaseado espejo.',
    price: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&q=80',
    isActive: true,
    category: 'Postres'
  },
  {
    id: 'prod_002',
    name: 'Croissant Clásico',
    description: '100% mantequilla francesa, capas crujientes y centro suave. Horneado hoy.',
    price: 8500,
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f40ce88cb?w=500&q=80',
    isActive: true,
    category: 'Pasteis'
  },
  {
    id: 'prod_003',
    name: 'Galleta de Macadamia y Chocolate Blanco',
    description: 'Nuestra famosa cookie estilo New York, crujiente por fuera, melcochuda por dentro.',
    price: 12000,
    imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&q=80',
    isActive: true,
    category: 'Cookies'
  }
];

export interface DeliveryWindow {
  id: string;
  label: string;
  date: string;
  maxCapacity: number;
  bookedCount: number;
  isActive: boolean;
}

export const mockWindows: DeliveryWindow[] = [
  {
    id: 'win_today_4',
    label: 'Hoy 4:00 PM - 6:00 PM',
    date: '2026-03-26',
    maxCapacity: 20,
    bookedCount: 15,
    isActive: true,
  },
  {
    id: 'win_today_6',
    label: 'Hoy 6:00 PM - 8:00 PM',
    date: '2026-03-26',
    maxCapacity: 20,
    bookedCount: 20, 
    isActive: true,
  },
  {
    id: 'win_tmrw_10',
    label: 'Mañana 10:00 AM - 12:00 PM',
    date: '2026-03-27',
    maxCapacity: 30,
    bookedCount: 5,  
    isActive: true,
  }
];