/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  code?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  createdAt: string;
  // Optional premium catalog fields
  galleryImages?: string[];
  material?: string;
  finish?: string;
  size?: string;
  careInstructions?: string;
  isNew?: boolean;
  isPromo?: boolean;
  isFeatured?: boolean;
  promoPrice?: number;
  estoque?: number | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'paid' | 'pending';
  paidDate?: string;
}

export interface Sale {
  id: string;
  customerId: string; // "balcao" for general counter sales without registered customer
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: 'cash' | 'credit' | 'pix' | 'credit_card' | 'debit_card' | 'fiado' | 'order'; // expanded payment options
  status: 'paid' | 'pending' | 'order' | 'partial'; // expanded status
  date: string; // YYYY-MM-DD
  createdAt: string;
  // Advanced payment/fiado tracking fields
  downPayment?: number; // valor de entrada
  installmentsCount?: number; // quantidade de parcelas (max 5)
  installments?: Installment[]; // array details of installments
  outstandingBalance?: number; // saldo devedor restante
}

export interface BrandConfig {
  brandName: string;
  logoUrl: string;
  bannerUrl: string;
  categories: string[];
  whatsAppNumber?: string; // Contact phone number to receive orders
  adminPassword?: string; // Optional password to protect the admin panel
  slogan?: string; // Custom tagline/slogan for catalog home banner
}

export interface CashEntry {
  id: string;
  type: 'in' | 'out';
  amount: number;
  description: string;
  date: string;
  saleId?: string;
  createdAt: string;
  paymentMethod?: 'pix' | 'card' | 'cash' | 'fiado';
}
