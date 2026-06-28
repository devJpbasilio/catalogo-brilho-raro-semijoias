/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDocs,
  setDoc as firebaseSetDoc,
  deleteDoc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase';
import { Product, Customer, Sale, BrandConfig, CashEntry } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  const stringifiedError = JSON.stringify(errInfo);
  console.error('Firestore Error (Graceful Fallback Active): ', stringifiedError);
}

// Helper to strip undefined values recursively so Firestore setDoc doesn't throw errors
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const value = (obj as any)[key];
      if (value !== undefined) {
        cleaned[key] = cleanUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

async function setDoc(docRef: any, data: any) {
  return firebaseSetDoc(docRef, cleanUndefined(data));
}

// Storage keys for localStorage fallback
const KEYS = {
  PRODUCTS: 'semijoias_products',
  CUSTOMERS: 'semijoias_customers',
  SALES: 'semijoias_sales',
  CASH_FLOW: 'semijoias_cash_flow',
  BRAND_CONFIG: 'semijoias_brand_config'
};

// Default Brand Config
const DEFAULT_BRAND_CONFIG: BrandConfig = {
  brandName: 'Brilho Raro Semijoias',
  logoUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=150&auto=format&fit=crop&q=80',
  bannerUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&auto=format&fit=crop&q=80',
  categories: ['Brincos', 'Colares', 'Anéis', 'Pulseiras', 'Tornozeleiras', 'Conjuntos']
};

// Beautiful high-quality demo products
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: 'Brinco de Argola Cravejada Ouro 18k',
    description: 'Brinco argola clássico com banho de ouro 18k e microzircônias brilhantes cravejadas. Antialérgico e com excelente durabilidade.',
    category: 'Brincos',
    price: 129.90,
    imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prod_2',
    name: 'Colar Veneziana Ponto de Luz Ouro',
    description: 'Corrente veneziana super delicada com pingente de zircônia cristal de alto brilho. Banho em ouro 18k com acabamento de joalheria.',
    category: 'Colares',
    price: 89.90,
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prod_3',
    name: 'Anel Solitário Cristal Ródio Branco',
    description: 'Clássico anel solitário cravejado com uma pedra central lapidada em alta precisão e laterais com microzircônias em ródio branco.',
    category: 'Anéis',
    price: 149.90,
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prod_4',
    name: 'Pulseira Elo Português com Coração',
    description: 'Pulseira elegante com elos portugueses redondos e um lindo pingente de coração liso abaulado. Banho de alta camada em ouro 18k.',
    category: 'Pulseiras',
    price: 119.90,
    imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prod_5',
    name: 'Tornozeleira Asa de Anjo Prata 925',
    description: 'Tornozeleira super charmosa confeccionada em Prata 925 legítima, com pingente vazado de asa de anjo e pequenas esferas polidas.',
    category: 'Tornozeleiras',
    price: 79.90,
    imageUrl: 'https://images.unsplash.com/photo-1543294001-f7cbfe92237e?w=400&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prod_6',
    name: 'Conjunto Luxo Fusion Esmeralda Gota',
    description: 'Conjunto deslumbrante de colar e brincos em formato de gota com pedra fusion verde esmeralda e borda cravejada de microzircônias pretas.',
    category: 'Conjuntos',
    price: 249.90,
    imageUrl: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=400&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock Customers
const MOCK_CUSTOMERS: Customer[] = [
  { id: 'cust_1', name: 'Ana Souza', phone: '(11) 98765-4321', createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cust_2', name: 'Mariana Costa', phone: '(21) 99888-7766', createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cust_3', name: 'Gabriela Lima', phone: '(31) 99123-4567', createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cust_4', name: 'Patrícia Rocha', phone: '(11) 97766-5544', createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() }
];

// Helper to determine storage status (local vs cloud)
export function getStorageMode(): 'cloud' | 'local' {
  if (!firebaseEnabled || !db) return 'local';
  const preference = localStorage.getItem('semijoias_storage_pref');
  return preference === 'local' ? 'local' : 'cloud';
}

export function setStorageMode(mode: 'cloud' | 'local'): void {
  localStorage.setItem('semijoias_storage_pref', mode);
}

// LOCAL STORAGE HELPERS
const getLocal = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Error reading from localStorage', e);
    return defaultValue;
  }
};

const setLocal = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing to localStorage', e);
  }
};

// PRODUCT OPERATIONS
export async function getProducts(): Promise<Product[]> {
  if (getStorageMode() === 'cloud') {
    try {
      const colRef = collection(db!, 'products');
      const snapshot = await getDocs(colRef);
      const list: Product[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Product);
      });
      // Sort by creation date descending
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.error('Firestore getProducts error, falling back to local:', e);
      handleFirestoreError(e, OperationType.GET, 'products');
    }
  }
  return getLocal<Product[]>(KEYS.PRODUCTS, []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveProduct(product: Product): Promise<void> {
  // Sync locally first
  const localList = getLocal<Product[]>(KEYS.PRODUCTS, []);
  const index = localList.findIndex(p => p.id === product.id);
  if (index >= 0) {
    localList[index] = product;
  } else {
    localList.push(product);
  }
  setLocal(KEYS.PRODUCTS, localList);

  if (getStorageMode() === 'cloud') {
    try {
      const docRef = doc(db!, 'products', product.id);
      await setDoc(docRef, product);
    } catch (e) {
      console.error('Firestore saveProduct error:', e);
      handleFirestoreError(e, OperationType.WRITE, `products/${product.id}`);
      throw e;
    }
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const localList = getLocal<Product[]>(KEYS.PRODUCTS, []);
  const filtered = localList.filter(p => p.id !== id);
  setLocal(KEYS.PRODUCTS, filtered);

  if (getStorageMode() === 'cloud') {
    try {
      const docRef = doc(db!, 'products', id);
      await deleteDoc(docRef);
    } catch (e) {
      console.error('Firestore deleteProduct error:', e);
      handleFirestoreError(e, OperationType.DELETE, `products/${id}`);
    }
  }
}

// CUSTOMER OPERATIONS
export async function getCustomers(): Promise<Customer[]> {
  if (getStorageMode() === 'cloud') {
    try {
      const colRef = collection(db!, 'customers');
      const snapshot = await getDocs(colRef);
      const list: Customer[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Customer);
      });
      return list.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      console.error('Firestore getCustomers error, falling back to local:', e);
      handleFirestoreError(e, OperationType.GET, 'customers');
    }
  }
  return getLocal<Customer[]>(KEYS.CUSTOMERS, []).sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveCustomer(customer: Customer): Promise<void> {
  const localList = getLocal<Customer[]>(KEYS.CUSTOMERS, []);
  const index = localList.findIndex(c => c.id === customer.id);
  if (index >= 0) {
    localList[index] = customer;
  } else {
    localList.push(customer);
  }
  setLocal(KEYS.CUSTOMERS, localList);

  if (getStorageMode() === 'cloud') {
    try {
      const docRef = doc(db!, 'customers', customer.id);
      await setDoc(docRef, customer);
    } catch (e) {
      console.error('Firestore saveCustomer error:', e);
      handleFirestoreError(e, OperationType.WRITE, `customers/${customer.id}`);
      throw e;
    }
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  const localList = getLocal<Customer[]>(KEYS.CUSTOMERS, []);
  const filtered = localList.filter(c => c.id !== id);
  setLocal(KEYS.CUSTOMERS, filtered);

  // Also remove relevant sales customer linking if needed (usually we keep sales but marked as deleted customer, or set customerId to 'balcao')
  const sales = getLocal<Sale[]>(KEYS.SALES, []);
  const updatedSales = sales.map(s => s.customerId === id ? { ...s, customerId: 'balcao', customerName: `${s.customerName} (Excluído)` } : s);
  setLocal(KEYS.SALES, updatedSales);

  if (getStorageMode() === 'cloud') {
    try {
      const docRef = doc(db!, 'customers', id);
      await deleteDoc(docRef);
      
      // Update sales in firestore to keep transactions consistent on the cloud
      const salesToUpdate = updatedSales.filter(s => s.customerId === 'balcao' && sales.find(os => os.id === s.id)?.customerId === id);
      for (const sale of salesToUpdate) {
        const saleDocRef = doc(db!, 'sales', sale.id);
        await setDoc(saleDocRef, sale);
      }
    } catch (e) {
      console.error('Firestore deleteCustomer error:', e);
      handleFirestoreError(e, OperationType.DELETE, `customers/${id}`);
    }
  }
}

// SALES OPERATIONS
export async function getSales(): Promise<Sale[]> {
  if (getStorageMode() === 'cloud') {
    try {
      const colRef = collection(db!, 'sales');
      const snapshot = await getDocs(colRef);
      const list: Sale[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Sale);
      });
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.error('Firestore getSales error, falling back to local:', e);
      handleFirestoreError(e, OperationType.GET, 'sales');
    }
  }
  return getLocal<Sale[]>(KEYS.SALES, []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveSale(sale: Sale): Promise<void> {
  const localList = getLocal<Sale[]>(KEYS.SALES, []);
  const index = localList.findIndex(s => s.id === sale.id);
  const isNewSale = index < 0;

  if (index >= 0) {
    localList[index] = sale;
  } else {
    localList.push(sale);
  }
  setLocal(KEYS.SALES, localList);

  // central stock decrement logic for new sales
  if (isNewSale) {
    const localProducts = getLocal<Product[]>(KEYS.PRODUCTS, []);
    let productsUpdated = false;

    for (const item of sale.items) {
      const prodIdx = localProducts.findIndex(p => p.id === item.productId);
      if (prodIdx >= 0) {
        const prod = localProducts[prodIdx];
        if (prod.estoque !== undefined && prod.estoque !== null) {
          prod.estoque = Math.max(0, prod.estoque - item.quantity);
          productsUpdated = true;
          // Update in Firestore immediately if in cloud storage mode
          if (getStorageMode() === 'cloud') {
            try {
              const docRef = doc(db!, 'products', prod.id);
              await setDoc(docRef, prod);
            } catch (e) {
              console.error('Firestore saveProduct stock-decrement error:', e);
            }
          }
        }
      }
    }

    if (productsUpdated) {
      setLocal(KEYS.PRODUCTS, localProducts);
    }
  }

  // Manage cash flow automatically
  await updateCashFlowFromSales();

  if (getStorageMode() === 'cloud') {
    try {
      const docRef = doc(db!, 'sales', sale.id);
      await setDoc(docRef, sale);
    } catch (e) {
      console.error('Firestore saveSale error:', e);
      handleFirestoreError(e, OperationType.WRITE, `sales/${sale.id}`);
      throw e;
    }
  }
}

export async function deleteSale(id: string): Promise<void> {
  const localList = getLocal<Sale[]>(KEYS.SALES, []);
  const filtered = localList.filter(s => s.id !== id);
  setLocal(KEYS.SALES, filtered);

  await updateCashFlowFromSales();

  if (getStorageMode() === 'cloud') {
    try {
      const docRef = doc(db!, 'sales', id);
      await deleteDoc(docRef);
    } catch (e) {
      console.error('Firestore deleteSale error:', e);
      handleFirestoreError(e, OperationType.DELETE, `sales/${id}`);
    }
  }
}

// CASH FLOW OPERATIONS
export async function getCashEntries(): Promise<CashEntry[]> {
  if (getStorageMode() === 'cloud') {
    try {
      const colRef = collection(db!, 'cash_flow');
      const snapshot = await getDocs(colRef);
      const list: CashEntry[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as CashEntry);
      });
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.error('Firestore getCashEntries error, falling back to local:', e);
      handleFirestoreError(e, OperationType.GET, 'cash_flow');
    }
  }
  return getLocal<CashEntry[]>(KEYS.CASH_FLOW, []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveCashEntry(entry: CashEntry): Promise<void> {
  const localList = getLocal<CashEntry[]>(KEYS.CASH_FLOW, []);
  const index = localList.findIndex(e => e.id === entry.id);
  if (index >= 0) {
    localList[index] = entry;
  } else {
    localList.push(entry);
  }
  setLocal(KEYS.CASH_FLOW, localList);

  if (getStorageMode() === 'cloud') {
    try {
      const docRef = doc(db!, 'cash_flow', entry.id);
      await setDoc(docRef, entry);
    } catch (e) {
      console.error('Firestore saveCashEntry error:', e);
      handleFirestoreError(e, OperationType.WRITE, `cash_flow/${entry.id}`);
    }
  }
}

// Helper to rebuild/update Cash Flow entries from paid sales automatically
// This keeps the cash flow in perfect sync
export async function updateCashFlowFromSales(): Promise<void> {
  const sales = getLocal<Sale[]>(KEYS.SALES, []);
  const currentEntries = getLocal<CashEntry[]>(KEYS.CASH_FLOW, []);
  
  // Keep manually added entries (entries without saleId), but replace entries with saleId
  const manualEntries = currentEntries.filter(e => !e.saleId);
  
  const salesEntries: CashEntry[] = [];
  
  sales.forEach(s => {
    if (s.status === 'order') return; // orders do not affect cash flow
    
    // Support legacy paymentMethod 'cash' and new non-fiado methods
    if (s.paymentMethod !== 'fiado' && s.paymentMethod !== 'credit') {
      let mappedMethod: 'pix' | 'card' | 'cash' | 'fiado' = 'cash';
      if (s.paymentMethod === 'pix') {
        mappedMethod = 'pix';
      } else if (s.paymentMethod === 'credit_card' || s.paymentMethod === 'debit_card') {
        mappedMethod = 'card';
      } else if (s.paymentMethod === 'cash') {
        mappedMethod = 'cash';
      }
      
      salesEntries.push({
        id: `cash_sale_${s.id}`,
        type: 'in',
        amount: s.totalAmount,
        description: `Venda #${s.id.substring(0, 5)} - Cliente: ${s.customerName}`,
        date: s.date,
        saleId: s.id,
        createdAt: s.createdAt,
        paymentMethod: mappedMethod
      });
    } else {
      // Fiado/Credit sale with installments and potential down payment
      // 1. Check down payment
      if (s.downPayment && s.downPayment > 0) {
        salesEntries.push({
          id: `cash_sale_down_${s.id}`,
          type: 'in',
          amount: s.downPayment,
          description: `Entrada Venda Fiado #${s.id.substring(0, 5)} - Cliente: ${s.customerName}`,
          date: s.date,
          saleId: s.id,
          createdAt: s.createdAt,
          paymentMethod: 'fiado'
        });
      }
      
      // 2. Check paid installments
      if (s.installments) {
        s.installments.forEach(inst => {
          if (inst.status === 'paid') {
            salesEntries.push({
              id: `cash_sale_inst_${s.id}_${inst.installmentNumber}`,
              type: 'in',
              amount: inst.amount,
              description: `Parcela ${inst.installmentNumber}/${s.installmentsCount || 1} Recebida #${s.id.substring(0, 5)} - Cliente: ${s.customerName}`,
              date: inst.paidDate ? inst.paidDate.split('T')[0] : s.date,
              saleId: s.id,
              createdAt: inst.paidDate || s.createdAt,
              paymentMethod: 'fiado'
            });
          }
        });
      } else if (s.status === 'paid') {
        // Legacy credit sale marked as fully paid
        salesEntries.push({
          id: `cash_sale_full_${s.id}`,
          type: 'in',
          amount: s.totalAmount,
          description: `Quitação Venda Fiado #${s.id.substring(0, 5)} - Cliente: ${s.customerName}`,
          date: s.date,
          saleId: s.id,
          createdAt: s.createdAt,
          paymentMethod: 'fiado'
        });
      }
    }
  });

  const merged = [...manualEntries, ...salesEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  setLocal(KEYS.CASH_FLOW, merged);

  if (getStorageMode() === 'cloud') {
    try {
      // 1. Get all current cash entries in Firestore to identify orphans
      const colRef = collection(db!, 'cash_flow');
      const snapshot = await getDocs(colRef);
      const existingFirestoreIds: string[] = [];
      snapshot.forEach(doc => {
        existingFirestoreIds.push(doc.id);
      });

      // 2. Identify entries starting with 'cash_sale_' that are no longer in our merged list (orphans)
      const mergedIds = new Set(merged.map(e => e.id));
      const orphans = existingFirestoreIds.filter(id => id.startsWith('cash_sale_') && !mergedIds.has(id));

      // 3. Delete those orphaned entries from Firestore
      for (const orphanId of orphans) {
        await deleteDoc(doc(db!, 'cash_flow', orphanId));
      }

      // 4. Create or update the active ones
      for (const entry of merged) {
        const docRef = doc(db!, 'cash_flow', entry.id);
        await setDoc(docRef, entry);
      }
    } catch (e) {
      console.error('Firestore error syncing cash flow:', e);
      handleFirestoreError(e, OperationType.WRITE, 'cash_flow');
    }
  }
}

// BRAND CONFIG OPERATIONS
export async function getBrandConfig(): Promise<BrandConfig> {
  if (getStorageMode() === 'cloud') {
    try {
      const docRef = doc(db!, 'config', 'brand');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as BrandConfig;
      }
    } catch (e) {
      console.error('Firestore getBrandConfig error, falling back to local:', e);
      handleFirestoreError(e, OperationType.GET, 'config/brand');
    }
  }
  return getLocal<BrandConfig>(KEYS.BRAND_CONFIG, DEFAULT_BRAND_CONFIG);
}

export async function saveBrandConfig(config: BrandConfig): Promise<void> {
  setLocal(KEYS.BRAND_CONFIG, config);

  if (getStorageMode() === 'cloud') {
    try {
      const docRef = doc(db!, 'config', 'brand');
      await setDoc(docRef, config);
    } catch (e) {
      console.error('Firestore saveBrandConfig error:', e);
      handleFirestoreError(e, OperationType.WRITE, 'config/brand');
    }
  }
}

// SEED INITIAL DEMO DATA
export async function seedInitialData(force = false): Promise<void> {
  const currentProducts = getLocal<Product[]>(KEYS.PRODUCTS, []);
  
  // Don't overwrite if data exists unless forced
  if (currentProducts.length > 0 && !force) {
    return;
  }

  // Save brand config
  setLocal(KEYS.BRAND_CONFIG, DEFAULT_BRAND_CONFIG);
  
  // Save products
  setLocal(KEYS.PRODUCTS, MOCK_PRODUCTS);
  
  // Save customers
  setLocal(KEYS.CUSTOMERS, MOCK_CUSTOMERS);

  // Let's create some realistic initial sales:
  // 1. Paid sale (dinheiro à vista)
  // 2. Pending sale (fiado)
  const sale1Id = 'sale_101';
  const sale2Id = 'sale_102';
  const sale3Id = 'sale_103';

  const initialSales: Sale[] = [
    {
      id: sale1Id,
      customerId: 'cust_1',
      customerName: 'Ana Souza',
      customerPhone: '(11) 98765-4321',
      items: [
        { productId: 'prod_1', productName: 'Brinco de Argola Cravejada Ouro 18k', price: 129.90, quantity: 1 }
      ],
      totalAmount: 129.90,
      paymentMethod: 'cash',
      status: 'paid',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: sale2Id,
      customerId: 'cust_2',
      customerName: 'Mariana Costa',
      customerPhone: '(21) 99888-7766',
      items: [
        { productId: 'prod_2', productName: 'Colar Veneziana Ponto de Luz Ouro', price: 89.90, quantity: 1 },
        { productId: 'prod_4', productName: 'Pulseira Elo Português com Coração', price: 119.90, quantity: 1 }
      ],
      totalAmount: 209.80,
      paymentMethod: 'credit', // Fiado
      status: 'pending',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: sale3Id,
      customerId: 'cust_3',
      customerName: 'Gabriela Lima',
      customerPhone: '(31) 99123-4567',
      items: [
        { productId: 'prod_5', productName: 'Tornozeleira Asa de Anjo Prata 925', price: 79.90, quantity: 1 }
      ],
      totalAmount: 79.90,
      paymentMethod: 'credit', // Fiado but paid later
      status: 'paid',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  setLocal(KEYS.SALES, initialSales);

  // Re-generate Cash flow entries
  await updateCashFlowFromSales();

  // If in cloud mode, attempt to upload everything to firestore
  if (getStorageMode() === 'cloud') {
    try {
      console.log('Seeding Firestore database...');
      // Save brand config
      await saveBrandConfig(DEFAULT_BRAND_CONFIG);

      // Save products
      for (const prod of MOCK_PRODUCTS) {
        await saveProduct(prod);
      }

      // Save customers
      for (const cust of MOCK_CUSTOMERS) {
        await saveCustomer(cust);
      }

      // Save sales
      for (const sale of initialSales) {
        await saveSale(sale);
      }
      
      console.log('Firestore seed completed.');
    } catch (e) {
      console.error('Firestore seeding failed:', e);
    }
  }
}
