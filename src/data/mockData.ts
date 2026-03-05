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
