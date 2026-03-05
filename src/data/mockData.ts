export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'no_show' | 'canceled';

export interface Professional {
  id: string;
  name: string;
  avatar: string;
  serviceCommission: number; // percentage
  productCommission: number; // percentage
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutes
  category: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'sale' | 'internal';
  quantity: number;
  minQuantity: number;
  costPrice: number;
  salePrice: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  professionalId: string;
  serviceIds: string[];
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
}

export interface CartItem {
  id: string;
  type: 'service' | 'product';
  name: string;
  price: number;
  quantity: number;
  professionalId?: string;
}

export interface Payment {
  method: 'pix' | 'credit' | 'debit' | 'cash';
  amount: number;
}

export interface CashMovement {
  id: string;
  type: 'sale' | 'sangria' | 'suprimento';
  amount: number;
  description: string;
  paymentMethod?: Payment['method'];
  payments?: Payment[];
  commission?: number;
  timestamp: string;
}

export interface CashRegisterSession {
  id: string;
  operator: string;
  date: string;
  openedAt: string;
  closedAt: string | null;
  initialFund: number;
  movements: CashMovement[];
  status: 'open' | 'closed';
  finalCashInDrawer?: number;
}

export const cashRegisterHistory: CashRegisterSession[] = [
  {
    id: 'cr1',
    operator: 'Carlos Silva',
    date: '2026-03-03',
    openedAt: '2026-03-03T08:00:00',
    closedAt: '2026-03-03T19:30:00',
    initialFund: 200,
    movements: [
      { id: 'm1', type: 'sale', amount: 70, description: 'Corte + Barba — João Mendes', payments: [{ method: 'cash', amount: 70 }], commission: 35, timestamp: '2026-03-03T09:50:00' },
      { id: 'm2', type: 'sale', amount: 45, description: 'Corte Masculino — Pedro Alves', payments: [{ method: 'pix', amount: 45 }], commission: 22.50, timestamp: '2026-03-03T10:30:00' },
      { id: 'm3', type: 'sangria', amount: 50, description: 'Pagamento motoboy', timestamp: '2026-03-03T12:00:00' },
      { id: 'm4', type: 'sale', amount: 115, description: 'Corte + Pomada — Lucas Ferreira', payments: [{ method: 'credit', amount: 70 }, { method: 'cash', amount: 45 }], commission: 39.50, timestamp: '2026-03-03T14:20:00' },
      { id: 'm5', type: 'suprimento', amount: 100, description: 'Troco extra', timestamp: '2026-03-03T15:00:00' },
      { id: 'm6', type: 'sale', amount: 80, description: 'Pigmentação — Gabriel Lima', payments: [{ method: 'debit', amount: 80 }], commission: 40, timestamp: '2026-03-03T16:40:00' },
    ],
    status: 'closed',
    finalCashInDrawer: 365,
  },
  {
    id: 'cr2',
    operator: 'André Oliveira',
    date: '2026-03-04',
    openedAt: '2026-03-04T08:30:00',
    closedAt: '2026-03-04T20:00:00',
    initialFund: 150,
    movements: [
      { id: 'm7', type: 'sale', amount: 150, description: 'Platinado — Thiago Nunes', payments: [{ method: 'pix', amount: 100 }, { method: 'cash', amount: 50 }], commission: 67.50, timestamp: '2026-03-04T10:30:00' },
      { id: 'm8', type: 'sale', amount: 55, description: 'Óleo para Barba — Pedro Alves', payments: [{ method: 'cash', amount: 55 }], commission: 5.50, timestamp: '2026-03-04T11:00:00' },
      { id: 'm9', type: 'sangria', amount: 80, description: 'Vale funcionário', timestamp: '2026-03-04T13:00:00' },
      { id: 'm10', type: 'sale', amount: 35, description: 'Barba Completa — Matheus Rocha', payments: [{ method: 'debit', amount: 35 }], commission: 15.75, timestamp: '2026-03-04T15:00:00' },
    ],
    status: 'closed',
    finalCashInDrawer: 175,
  },
];

export const professionals: Professional[] = [
  { id: 'p1', name: 'Carlos Silva', avatar: 'CS', serviceCommission: 50, productCommission: 10 },
  { id: 'p2', name: 'André Oliveira', avatar: 'AO', serviceCommission: 45, productCommission: 10 },
  { id: 'p3', name: 'Rafael Costa', avatar: 'RC', serviceCommission: 50, productCommission: 15 },
  { id: 'p4', name: 'Bruno Santos', avatar: 'BS', serviceCommission: 40, productCommission: 10 },
];

export const services: Service[] = [
  { id: 's1', name: 'Corte Masculino', price: 45, duration: 30, category: 'Corte' },
  { id: 's2', name: 'Barba Completa', price: 35, duration: 20, category: 'Barba' },
  { id: 's3', name: 'Corte + Barba', price: 70, duration: 50, category: 'Combo' },
  { id: 's4', name: 'Pigmentação', price: 80, duration: 40, category: 'Tratamento' },
  { id: 's5', name: 'Hidratação Capilar', price: 50, duration: 30, category: 'Tratamento' },
  { id: 's6', name: 'Corte Infantil', price: 35, duration: 25, category: 'Corte' },
  { id: 's7', name: 'Sobrancelha', price: 15, duration: 10, category: 'Acabamento' },
  { id: 's8', name: 'Platinado', price: 150, duration: 90, category: 'Coloração' },
];

export const products: Product[] = [
  { id: 'pr1', name: 'Pomada Matte', category: 'sale', quantity: 24, minQuantity: 5, costPrice: 18, salePrice: 45 },
  { id: 'pr2', name: 'Óleo para Barba', category: 'sale', quantity: 15, minQuantity: 5, costPrice: 22, salePrice: 55 },
  { id: 'pr3', name: 'Shampoo Anticaspa', category: 'sale', quantity: 8, minQuantity: 10, costPrice: 15, salePrice: 38 },
  { id: 'pr4', name: 'Cera Modeladora', category: 'sale', quantity: 3, minQuantity: 5, costPrice: 20, salePrice: 48 },
  { id: 'pr5', name: 'Balm Pós-Barba', category: 'sale', quantity: 12, minQuantity: 5, costPrice: 25, salePrice: 60 },
  { id: 'pr6', name: 'Lâmina Descartável (cx)', category: 'internal', quantity: 2, minQuantity: 5, costPrice: 35, salePrice: 0 },
  { id: 'pr7', name: 'Descolorante (un)', category: 'internal', quantity: 18, minQuantity: 10, costPrice: 12, salePrice: 0 },
  { id: 'pr8', name: 'Toalha Descartável (pct)', category: 'internal', quantity: 4, minQuantity: 8, costPrice: 28, salePrice: 0 },
  { id: 'pr9', name: 'Gel de Barbear', category: 'internal', quantity: 6, minQuantity: 3, costPrice: 18, salePrice: 0 },
  { id: 'pr10', name: 'Spray Fixador', category: 'sale', quantity: 20, minQuantity: 5, costPrice: 14, salePrice: 35 },
];

export const clients: Client[] = [
  { id: 'c1', name: 'João Mendes', phone: '(11) 99876-5432', email: 'joao@email.com' },
  { id: 'c2', name: 'Pedro Alves', phone: '(11) 98765-4321', email: 'pedro@email.com' },
  { id: 'c3', name: 'Lucas Ferreira', phone: '(11) 97654-3210', email: 'lucas@email.com' },
  { id: 'c4', name: 'Gabriel Lima', phone: '(11) 96543-2109', email: 'gabriel@email.com' },
  { id: 'c5', name: 'Matheus Rocha', phone: '(11) 95432-1098', email: 'matheus@email.com' },
  { id: 'c6', name: 'Thiago Nunes', phone: '(11) 94321-0987', email: 'thiago@email.com' },
];

const today = new Date().toISOString().split('T')[0];

export const initialAppointments: Appointment[] = [
  { id: 'a1', clientId: 'c1', professionalId: 'p1', serviceIds: ['s3'], date: today, time: '09:00', duration: 50, status: 'confirmed' },
  { id: 'a2', clientId: 'c2', professionalId: 'p2', serviceIds: ['s1'], date: today, time: '09:30', duration: 30, status: 'pending' },
  { id: 'a3', clientId: 'c3', professionalId: 'p1', serviceIds: ['s1', 's7'], date: today, time: '10:00', duration: 40, status: 'completed' },
  { id: 'a4', clientId: 'c4', professionalId: 'p3', serviceIds: ['s4'], date: today, time: '10:00', duration: 40, status: 'confirmed' },
  { id: 'a5', clientId: 'c5', professionalId: 'p2', serviceIds: ['s2'], date: today, time: '10:30', duration: 20, status: 'pending' },
  { id: 'a6', clientId: 'c6', professionalId: 'p4', serviceIds: ['s8'], date: today, time: '11:00', duration: 90, status: 'confirmed' },
  { id: 'a7', clientId: 'c1', professionalId: 'p3', serviceIds: ['s5'], date: today, time: '14:00', duration: 30, status: 'pending' },
  { id: 'a8', clientId: 'c2', professionalId: 'p1', serviceIds: ['s3'], date: today, time: '14:00', duration: 50, status: 'no_show' },
];
