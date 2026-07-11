/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, supabaseEnabled } from './supabase';
import { Product, Customer, Sale, BrandConfig, CashEntry } from '../types';
import { brandLogoDataUri } from './brand';
import { shouldDecrementStock } from './sales';
import { deriveCashEntriesFromSales } from './cashflow';

/**
 * Camada de dados. Sempre grava localmente (localStorage) e, em modo nuvem,
 * também no Supabase (Postgres). O modelo é "documento": cada linha guarda o
 * objeto completo na coluna `data` (jsonb) — ver supabase-schema.sql.
 */

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleDbError(error: unknown, operationType: OperationType, path: string | null) {
  const info = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('Supabase Error (Graceful Fallback Active): ', JSON.stringify(info));
}

// Storage keys for localStorage
const KEYS = {
  PRODUCTS: 'semijoias_products',
  CUSTOMERS: 'semijoias_customers',
  SALES: 'semijoias_sales',
  CASH_FLOW: 'semijoias_cash_flow',
  BRAND_CONFIG: 'semijoias_brand_config',
};

// Default Brand Config (logo = mark próprio da marca)
const DEFAULT_BRAND_CONFIG: BrandConfig = {
  brandName: 'Brilho Raro Semijoias',
  logoUrl: brandLogoDataUri,
  bannerUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&auto=format&fit=crop&q=80',
  categories: ['Brincos', 'Colares', 'Anéis', 'Pulseiras', 'Tornozeleiras', 'Conjuntos'],
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
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod_2',
    name: 'Colar Veneziana Ponto de Luz Ouro',
    description: 'Corrente veneziana super delicada com pingente de zircônia cristal de alto brilho. Banho em ouro 18k com acabamento de joalheria.',
    category: 'Colares',
    price: 89.90,
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod_3',
    name: 'Anel Solitário Cristal Ródio Branco',
    description: 'Clássico anel solitário cravejado com uma pedra central lapidada em alta precisão e laterais com microzircônias em ródio branco.',
    category: 'Anéis',
    price: 149.90,
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod_4',
    name: 'Pulseira Elo Português com Coração',
    description: 'Pulseira elegante com elos portugueses redondos e um lindo pingente de coração liso abaulado. Banho de alta camada em ouro 18k.',
    category: 'Pulseiras',
    price: 119.90,
    imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod_5',
    name: 'Tornozeleira Asa de Anjo Prata 925',
    description: 'Tornozeleira super charmosa confeccionada em Prata 925 legítima, com pingente vazado de asa de anjo e pequenas esferas polidas.',
    category: 'Tornozeleiras',
    price: 79.90,
    imageUrl: 'https://images.unsplash.com/photo-1543294001-f7cbfe92237e?w=400&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prod_6',
    name: 'Conjunto Luxo Fusion Esmeralda Gota',
    description: 'Conjunto deslumbrante de colar e brincos em formato de gota com pedra fusion verde esmeralda e borda cravejada de microzircônias pretas.',
    category: 'Conjuntos',
    price: 249.90,
    imageUrl: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=400&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock Customers
const MOCK_CUSTOMERS: Customer[] = [
  { id: 'cust_1', name: 'Ana Souza', phone: '(11) 98765-4321', createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cust_2', name: 'Mariana Costa', phone: '(21) 99888-7766', createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cust_3', name: 'Gabriela Lima', phone: '(31) 99123-4567', createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cust_4', name: 'Patrícia Rocha', phone: '(11) 97766-5544', createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
];

// Helper to determine storage status (local vs cloud)
export function getStorageMode(): 'cloud' | 'local' {
  if (!supabaseEnabled || !supabase) return 'local';
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

// Supabase helpers (modelo documento: { id, data })
async function cloudList<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase!.from(table).select('data');
  if (error) throw error;
  return (data ?? []).map((row: { data: T }) => row.data);
}

async function cloudUpsert<T extends { id: string }>(table: string, obj: T): Promise<void> {
  const { error } = await supabase!.from(table).upsert({ id: obj.id, data: obj });
  if (error) throw error;
}

async function cloudDelete(table: string, id: string): Promise<void> {
  const { error } = await supabase!.from(table).delete().eq('id', id);
  if (error) throw error;
}

// PRODUCT OPERATIONS
export async function getProducts(): Promise<Product[]> {
  if (getStorageMode() === 'cloud') {
    try {
      const list = await cloudList<Product>('products');
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.error('Supabase getProducts error, falling back to local:', e);
      handleDbError(e, OperationType.GET, 'products');
    }
  }
  return getLocal<Product[]>(KEYS.PRODUCTS, []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveProduct(product: Product): Promise<void> {
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
      await cloudUpsert('products', product);
    } catch (e) {
      console.error('Supabase saveProduct error:', e);
      handleDbError(e, OperationType.WRITE, `products/${product.id}`);
      throw e;
    }
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const localList = getLocal<Product[]>(KEYS.PRODUCTS, []);
  setLocal(KEYS.PRODUCTS, localList.filter(p => p.id !== id));

  if (getStorageMode() === 'cloud') {
    try {
      await cloudDelete('products', id);
    } catch (e) {
      console.error('Supabase deleteProduct error:', e);
      handleDbError(e, OperationType.DELETE, `products/${id}`);
    }
  }
}

// CUSTOMER OPERATIONS
export async function getCustomers(): Promise<Customer[]> {
  if (getStorageMode() === 'cloud') {
    try {
      const list = await cloudList<Customer>('customers');
      return list.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      console.error('Supabase getCustomers error, falling back to local:', e);
      handleDbError(e, OperationType.GET, 'customers');
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
      await cloudUpsert('customers', customer);
    } catch (e) {
      console.error('Supabase saveCustomer error:', e);
      handleDbError(e, OperationType.WRITE, `customers/${customer.id}`);
      throw e;
    }
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  const localList = getLocal<Customer[]>(KEYS.CUSTOMERS, []);
  setLocal(KEYS.CUSTOMERS, localList.filter(c => c.id !== id));

  // Mantém as vendas, mas desvincula o cliente excluído (vira "balcão").
  const sales = getLocal<Sale[]>(KEYS.SALES, []);
  const updatedSales = sales.map(s => s.customerId === id ? { ...s, customerId: 'balcao', customerName: `${s.customerName} (Excluído)` } : s);
  setLocal(KEYS.SALES, updatedSales);

  if (getStorageMode() === 'cloud') {
    try {
      await cloudDelete('customers', id);
      // Atualiza no Supabase as vendas que foram desvinculadas.
      const salesToUpdate = updatedSales.filter(s => s.customerId === 'balcao' && sales.find(os => os.id === s.id)?.customerId === id);
      for (const sale of salesToUpdate) {
        await cloudUpsert('sales', sale);
      }
    } catch (e) {
      console.error('Supabase deleteCustomer error:', e);
      handleDbError(e, OperationType.DELETE, `customers/${id}`);
    }
  }
}

// SALES OPERATIONS
export async function getSales(): Promise<Sale[]> {
  if (getStorageMode() === 'cloud') {
    try {
      const list = await cloudList<Sale>('sales');
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.error('Supabase getSales error, falling back to local:', e);
      handleDbError(e, OperationType.GET, 'sales');
    }
  }
  return getLocal<Sale[]>(KEYS.SALES, []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveSale(sale: Sale): Promise<void> {
  const localList = getLocal<Sale[]>(KEYS.SALES, []);
  const index = localList.findIndex(s => s.id === sale.id);
  const previousSale = index >= 0 ? localList[index] : null;

  if (index >= 0) {
    localList[index] = sale;
  } else {
    localList.push(sale);
  }
  setLocal(KEYS.SALES, localList);

  // Baixa de estoque centralizada e idempotente (ver shouldDecrementStock):
  // só na transição para venda confirmada, evitando decremento duplicado.
  if (shouldDecrementStock(previousSale, sale)) {
    const localProducts = getLocal<Product[]>(KEYS.PRODUCTS, []);
    let productsUpdated = false;

    for (const item of sale.items) {
      const prodIdx = localProducts.findIndex(p => p.id === item.productId);
      if (prodIdx >= 0) {
        const prod = localProducts[prodIdx];
        if (prod.estoque !== undefined && prod.estoque !== null) {
          prod.estoque = Math.max(0, prod.estoque - item.quantity);
          productsUpdated = true;
          if (getStorageMode() === 'cloud') {
            try {
              await cloudUpsert('products', prod);
            } catch (e) {
              console.error('Supabase saveProduct stock-decrement error:', e);
            }
          }
        }
      }
    }

    if (productsUpdated) {
      setLocal(KEYS.PRODUCTS, localProducts);
    }
  }

  // Grava a venda na nuvem ANTES de reconstruir o caixa, para que
  // updateCashFlowFromSales (que lê as vendas da nuvem no modo cloud) já
  // enxergue esta venda ao recalcular as entradas de caixa.
  if (getStorageMode() === 'cloud') {
    try {
      await cloudUpsert('sales', sale);
    } catch (e) {
      console.error('Supabase saveSale error:', e);
      handleDbError(e, OperationType.WRITE, `sales/${sale.id}`);
      throw e;
    }
  }

  await updateCashFlowFromSales();
}

export async function deleteSale(id: string): Promise<void> {
  const localList = getLocal<Sale[]>(KEYS.SALES, []);
  const saleToDelete = localList.find(s => s.id === id);
  setLocal(KEYS.SALES, localList.filter(s => s.id !== id));

  // Estorna o estoque das peças da venda excluída. Pedidos do catálogo
  // (status 'order') nunca deram baixa, então não devem ser estornados.
  if (saleToDelete && saleToDelete.status !== 'order') {
    const localProducts = getLocal<Product[]>(KEYS.PRODUCTS, []);
    let productsUpdated = false;

    for (const item of saleToDelete.items) {
      const prodIdx = localProducts.findIndex(p => p.id === item.productId);
      if (prodIdx >= 0) {
        const prod = localProducts[prodIdx];
        if (prod.estoque !== undefined && prod.estoque !== null) {
          prod.estoque = prod.estoque + item.quantity;
          productsUpdated = true;
          if (getStorageMode() === 'cloud') {
            try {
              await cloudUpsert('products', prod);
            } catch (e) {
              console.error('Supabase stock-restore error:', e);
            }
          }
        }
      }
    }

    if (productsUpdated) {
      setLocal(KEYS.PRODUCTS, localProducts);
    }
  }

  // Remove a venda da nuvem ANTES de reconstruir o caixa.
  if (getStorageMode() === 'cloud') {
    try {
      await cloudDelete('sales', id);
    } catch (e) {
      console.error('Supabase deleteSale error:', e);
      handleDbError(e, OperationType.DELETE, `sales/${id}`);
    }
  }

  await updateCashFlowFromSales();
}

// CASH FLOW OPERATIONS
export async function getCashEntries(): Promise<CashEntry[]> {
  if (getStorageMode() === 'cloud') {
    try {
      const list = await cloudList<CashEntry>('cash_flow');
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.error('Supabase getCashEntries error, falling back to local:', e);
      handleDbError(e, OperationType.GET, 'cash_flow');
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
      await cloudUpsert('cash_flow', entry);
    } catch (e) {
      console.error('Supabase saveCashEntry error:', e);
      handleDbError(e, OperationType.WRITE, `cash_flow/${entry.id}`);
    }
  }
}

// Reconstrói/atualiza as entradas de Cash Flow derivadas das vendas.
// Mantém o caixa em sincronia perfeita com as vendas.
export async function updateCashFlowFromSales(): Promise<void> {
  // Em modo nuvem, a fonte de verdade das vendas é o Supabase. Ler apenas o
  // localStorage aqui (ex.: em um dispositivo novo com cache local vazio) faria
  // esta função apagar entradas de caixa históricas legítimas da nuvem.
  let sales: Sale[];
  if (getStorageMode() === 'cloud') {
    try {
      sales = await cloudList<Sale>('sales');
    } catch (e) {
      console.error('Supabase read for cash flow sync failed, using local sales:', e);
      handleDbError(e, OperationType.LIST, 'sales');
      sales = getLocal<Sale[]>(KEYS.SALES, []);
    }
  } else {
    sales = getLocal<Sale[]>(KEYS.SALES, []);
  }
  const currentEntries = getLocal<CashEntry[]>(KEYS.CASH_FLOW, []);

  // Mantém lançamentos manuais (sem saleId), substitui os derivados de vendas.
  const manualEntries = currentEntries.filter(e => !e.saleId);

  // Derivação (pura e testada) das entradas de caixa a partir das vendas.
  const salesEntries = deriveCashEntriesFromSales(sales);

  const merged = [...manualEntries, ...salesEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  setLocal(KEYS.CASH_FLOW, merged);

  if (getStorageMode() === 'cloud') {
    try {
      // 1. IDs de caixa atualmente na nuvem, para identificar órfãos.
      const existing = await supabase!.from('cash_flow').select('id');
      if (existing.error) throw existing.error;
      const existingIds: string[] = (existing.data ?? []).map((r: { id: string }) => r.id);

      // 2. Entradas 'cash_sale_' que não estão mais na lista reconstruída.
      const mergedIds = new Set(merged.map(e => e.id));
      const orphans = existingIds.filter(id => id.startsWith('cash_sale_') && !mergedIds.has(id));

      // 3. Remove os órfãos.
      if (orphans.length > 0) {
        const { error } = await supabase!.from('cash_flow').delete().in('id', orphans);
        if (error) throw error;
      }

      // 4. Cria/atualiza os ativos (upsert em lote).
      if (merged.length > 0) {
        const rows = merged.map(e => ({ id: e.id, data: e }));
        const { error } = await supabase!.from('cash_flow').upsert(rows);
        if (error) throw error;
      }
    } catch (e) {
      console.error('Supabase error syncing cash flow:', e);
      handleDbError(e, OperationType.WRITE, 'cash_flow');
    }
  }
}

// BRAND CONFIG OPERATIONS
export async function getBrandConfig(): Promise<BrandConfig> {
  if (getStorageMode() === 'cloud') {
    try {
      const { data, error } = await supabase!.from('config').select('data').eq('id', 'brand').maybeSingle();
      if (error) throw error;
      if (data?.data) {
        return data.data as BrandConfig;
      }
    } catch (e) {
      console.error('Supabase getBrandConfig error, falling back to local:', e);
      handleDbError(e, OperationType.GET, 'config/brand');
    }
  }
  return getLocal<BrandConfig>(KEYS.BRAND_CONFIG, DEFAULT_BRAND_CONFIG);
}

export async function saveBrandConfig(config: BrandConfig): Promise<void> {
  setLocal(KEYS.BRAND_CONFIG, config);

  if (getStorageMode() === 'cloud') {
    try {
      const { error } = await supabase!.from('config').upsert({ id: 'brand', data: config });
      if (error) throw error;
    } catch (e) {
      console.error('Supabase saveBrandConfig error:', e);
      handleDbError(e, OperationType.WRITE, 'config/brand');
    }
  }
}

// SEED INITIAL DEMO DATA
export async function seedInitialData(force = false): Promise<void> {
  const currentProducts = getLocal<Product[]>(KEYS.PRODUCTS, []);

  // Não sobrescreve dados existentes, a menos que forçado.
  if (currentProducts.length > 0 && !force) {
    return;
  }

  setLocal(KEYS.BRAND_CONFIG, DEFAULT_BRAND_CONFIG);
  setLocal(KEYS.PRODUCTS, MOCK_PRODUCTS);
  setLocal(KEYS.CUSTOMERS, MOCK_CUSTOMERS);

  const initialSales: Sale[] = [
    {
      id: 'sale_101',
      customerId: 'cust_1',
      customerName: 'Ana Souza',
      customerPhone: '(11) 98765-4321',
      items: [
        { productId: 'prod_1', productName: 'Brinco de Argola Cravejada Ouro 18k', price: 129.90, quantity: 1 },
      ],
      totalAmount: 129.90,
      paymentMethod: 'cash',
      status: 'paid',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'sale_102',
      customerId: 'cust_2',
      customerName: 'Mariana Costa',
      customerPhone: '(21) 99888-7766',
      items: [
        { productId: 'prod_2', productName: 'Colar Veneziana Ponto de Luz Ouro', price: 89.90, quantity: 1 },
        { productId: 'prod_4', productName: 'Pulseira Elo Português com Coração', price: 119.90, quantity: 1 },
      ],
      totalAmount: 209.80,
      paymentMethod: 'credit',
      status: 'pending',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'sale_103',
      customerId: 'cust_3',
      customerName: 'Gabriela Lima',
      customerPhone: '(31) 99123-4567',
      items: [
        { productId: 'prod_5', productName: 'Tornozeleira Asa de Anjo Prata 925', price: 79.90, quantity: 1 },
      ],
      totalAmount: 79.90,
      paymentMethod: 'credit',
      status: 'paid',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  setLocal(KEYS.SALES, initialSales);

  await updateCashFlowFromSales();

  // Em modo nuvem, sobe tudo para o Supabase.
  if (getStorageMode() === 'cloud') {
    try {
      console.log('Seeding Supabase database...');
      await saveBrandConfig(DEFAULT_BRAND_CONFIG);
      for (const prod of MOCK_PRODUCTS) await cloudUpsert('products', prod);
      for (const cust of MOCK_CUSTOMERS) await cloudUpsert('customers', cust);
      for (const sale of initialSales) await cloudUpsert('sales', sale);
      await updateCashFlowFromSales();
      console.log('Supabase seed completed.');
    } catch (e) {
      console.error('Supabase seeding failed:', e);
    }
  }
}
