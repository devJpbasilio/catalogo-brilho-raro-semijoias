/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Navbar, { TabId } from './components/Navbar';
import Header from './components/Header';
import CatalogTab from './components/CatalogTab';
import SalesTab from './components/SalesTab';
import CustomersTab from './components/CustomersTab';
import DashboardTab from './components/DashboardTab';
import DashboardHome from './components/DashboardHome';
import SettingsTab from './components/SettingsTab';
import PublicCatalog from './components/PublicCatalog';
import AdminLogin from './components/AdminLogin';
import BrandLogo from './components/BrandLogo';
import { Product, Customer, Sale, BrandConfig, CashEntry } from './types';
import { 
  getProducts, saveProduct, deleteProduct,
  getCustomers, saveCustomer, deleteCustomer,
  getSales, saveSale, deleteSale,
  getCashEntries, saveCashEntry,
  getBrandConfig, saveBrandConfig,
  seedInitialData, getStorageMode, setStorageMode
} from './lib/db';
import { supabaseEnabled } from './lib/supabase';
import { isAuthAvailable, subscribeAuth, signOutAdmin } from './lib/auth';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [openCustomerModalOnLoad, setOpenCustomerModalOnLoad] = useState(false);
  const [isPublicCatalog, setIsPublicCatalog] = useState(false);
  // Em modo local (sem Supabase) o acesso é aberto: dados nunca saem do dispositivo.
  const [isAuthenticated, setIsAuthenticated] = useState(!isAuthAvailable());
  const [authReady, setAuthReady] = useState(!isAuthAvailable());

  const handleLogout = async () => {
    await signOutAdmin();
    // subscribeAuth reagirá e atualizará isAuthenticated para false.
  };

  // Data States
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    brandName: 'Brilho Raro Semijoias',
    logoUrl: '',
    bannerUrl: '',
    categories: []
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  
  // Sync Status States
  const [storageModeState, setStorageModeState] = useState<'cloud' | 'local'>('local');
  const [loading, setLoading] = useState(true);

  // Load all data on mount
  const loadAllData = async () => {
    setLoading(true);
    try {
      const mode = getStorageMode();
      setStorageModeState(mode);

      // Load brand config first
      const config = await getBrandConfig();
      setBrandConfig(config);

      // Load products. Não semeamos dados de demonstração automaticamente:
      // um catálogo vazio é o estado legítimo de uma loja nova, e o auto-seed
      // reinjetaria produtos/clientes/vendas fictícios (inclusive na nuvem)
      // sempre que a loja esvaziasse o catálogo. A demonstração continua
      // disponível sob demanda em Ajustes → "Carregar Catálogo de Demonstração".
      const prodList = await getProducts();
      setProducts(prodList);

      // Load other data collections
      const custList = await getCustomers();
      setCustomers(custList);

      const salesList = await getSales();
      setSales(salesList);

      const cashList = await getCashEntries();
      setCashEntries(cashList);

    } catch (e) {
      console.error('Error loading application data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const params = new URLSearchParams(window.location.search);
    if (params.get('catalog') === 'true') {
      setIsPublicCatalog(true);
    }
  }, []);

  // Observa o estado real de autenticação (Supabase Auth).
  useEffect(() => {
    if (!isAuthAvailable()) return; // modo local: acesso já liberado
    const unsubscribe = subscribeAuth((user) => {
      setIsAuthenticated(!!user);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const handleBackToAdmin = () => {
    setIsPublicCatalog(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('catalog');
    window.history.pushState({}, '', url.toString());
  };

  // PRODUCT ACTIONS
  const handleSaveProduct = async (product: Product) => {
    await saveProduct(product);
    const prodList = await getProducts();
    setProducts(prodList);
  };

  const handleDeleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    await deleteProduct(id);
    const prodList = await getProducts();
    setProducts(prodList);
  };

  // CUSTOMER ACTIONS
  const handleSaveCustomer = async (customer: Customer) => {
    await saveCustomer(customer);
    const custList = await getCustomers();
    setCustomers(custList);
  };

  const handleDeleteCustomer = async (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    setSales(prev => prev.map(s => s.customerId === id ? { ...s, customerId: 'balcao', customerName: `${s.customerName} (Excluído)` } : s));
    await deleteCustomer(id);
    const custList = await getCustomers();
    setCustomers(custList);
    // Reload sales too because deleteCustomer updates sales customer link
    const salesList = await getSales();
    setSales(salesList);
  };

  // SALE ACTIONS
  const handleRegisterSale = async (sale: Sale) => {
    // A baixa de estoque é feita de forma centralizada em saveSale (apenas em
    // vendas novas e confirmadas). Pedidos do catálogo (status 'order') não
    // dão baixa até serem aprovados. Aqui apenas persistimos a venda.
    await saveSale(sale);
    // Reload products list to refletir a baixa de estoque aplicada em saveSale.
    const prodList = await getProducts();
    setProducts(prodList);
    // Reload sales and cash flow
    const salesList = await getSales();
    setSales(salesList);
    const cashList = await getCashEntries();
    setCashEntries(cashList);
  };

  const handleDeleteSale = async (id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));
    await deleteSale(id);
    const salesList = await getSales();
    setSales(salesList);
    const cashList = await getCashEntries();
    setCashEntries(cashList);
  };

  const handleUpdateSale = async (sale: Sale) => {
    await saveSale(sale);
    const salesList = await getSales();
    setSales(salesList);
    const cashList = await getCashEntries();
    setCashEntries(cashList);
  };

  // CASH FLOW ACTIONS
  const handleAddCashEntry = async (entry: CashEntry) => {
    await saveCashEntry(entry);
    const cashList = await getCashEntries();
    setCashEntries(cashList);
  };

  // BRAND CONFIG ACTION
  const handleSaveBrandConfig = async (config: BrandConfig) => {
    await saveBrandConfig(config);
    setBrandConfig(config);
  };

  // SEED TRIGGER
  const handleSeedData = async () => {
    await seedInitialData(true);
    await loadAllData();
  };

  // STORAGE TOGGLE
  const handleToggleStorageMode = (mode: 'cloud' | 'local') => {
    setStorageMode(mode);
    setStorageModeState(mode);
    loadAllData(); // reload collections from selected storage provider
  };

  // Render active tab panel
  const renderTabContent = () => {
    switch (activeTab) {
      case 'catalog':
        return (
          <CatalogTab
            products={products}
            customers={customers}
            brandConfig={brandConfig}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddSale={handleRegisterSale}
            onAddCustomer={handleSaveCustomer}
          />
        );
      case 'sales':
        return (
          <SalesTab
            sales={sales}
            products={products}
            customers={customers}
            onAddSale={handleRegisterSale}
            onDeleteSale={handleDeleteSale}
            onAddCustomerClick={() => {
              setActiveTab('customers');
              setOpenCustomerModalOnLoad(true);
            }}
          />
        );
      case 'customers':
        return (
          <CustomersTab
            customers={customers}
            sales={sales}
            onAddCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onUpdateSale={handleUpdateSale}
            openCustomerModalOnLoad={openCustomerModalOnLoad}
            onResetCustomerModalTrigger={() => setOpenCustomerModalOnLoad(false)}
          />
        );
      case 'dashboard':
        return (
          <DashboardHome
            cashEntries={cashEntries}
            sales={sales}
            products={products}
            customers={customers}
            brandConfig={brandConfig}
            onTabChange={setActiveTab}
          />
        );
      case 'financial':
        return (
          <DashboardTab
            cashEntries={cashEntries}
            sales={sales}
            products={products}
            onAddCashEntry={handleAddCashEntry}
          />
        );
      case 'settings':
        return (
          <SettingsTab
            brandConfig={brandConfig}
            storageMode={storageModeState}
            cloudAvailable={supabaseEnabled}
            onSaveConfig={handleSaveBrandConfig}
            onSeedData={handleSeedData}
            onToggleStorageMode={handleToggleStorageMode}
          />
        );
      default:
        return null;
    }
  };

  if (loading || (isAuthAvailable() && !authReady)) {
    return (
      <div id="loading-screen" className="flex flex-col items-center justify-center min-h-screen bg-brand-porcelain p-6">
        <div className="relative mb-5">
          <div className="animate-pulse">
            <BrandLogo size={72} />
          </div>
          <RefreshCw className="w-5 h-5 text-brand-rosewood absolute -bottom-1 -right-1 animate-spin" />
        </div>
        <p className="brand-wordmark text-neutral-800 text-xl">
          {brandConfig.brandName}
        </p>
        <p className="text-xs text-neutral-400 mt-1 font-medium">Carregando catálogo e relatórios...</p>
      </div>
    );
  }

  if (isPublicCatalog) {
    return (
      <div id="public-preview-frame" className="h-[100dvh] w-full bg-neutral-50 md:bg-neutral-900 md:py-8 flex justify-center items-center overflow-hidden">
        <div className="w-full max-w-md bg-neutral-50 h-full md:h-[85vh] md:max-h-[90vh] md:rounded-3xl md:shadow-2xl relative overflow-hidden flex flex-col md:border-4 md:border-neutral-850">
          {/* Back to Admin Float Badge - Only show if authenticated admin */}
          {isAuthenticated && (
            <button
              id="btn-back-to-admin"
              onClick={handleBackToAdmin}
              className="absolute top-4 left-4 z-50 bg-neutral-900/85 backdrop-blur-md hover:bg-neutral-900 text-white font-bold text-[10px] px-3.5 py-2 rounded-full border border-neutral-700/50 flex items-center gap-1 shadow-md cursor-pointer transition-all uppercase tracking-widest"
            >
              <span>← Voltar ao Painel</span>
            </button>
          )}
          
          <PublicCatalog products={products} brandConfig={brandConfig} onAddSale={handleRegisterSale} />
        </div>
      </div>
    );
  }

  if (isAuthAvailable() && !isAuthenticated) {
    return <AdminLogin brandConfig={brandConfig} />;
  }

  return (
    <div id="app-layout" className="min-h-screen bg-brand-porcelain flex flex-col md:flex-row text-neutral-800 font-sans">
      
      {/* Navigation Layer */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        storageMode={storageModeState}
        hasPassword={isAuthAvailable()}
        onLogout={handleLogout}
        brandName={brandConfig.brandName}
      />

      {/* Main Panel Content */}
      <main id="main-content" className="flex-1 flex flex-col min-h-screen md:max-h-screen md:overflow-y-auto">
        
        {/* Dynamic header size depending on whether catalog tab is open */}
        <Header
          brandConfig={brandConfig}
          isCompact={activeTab !== 'catalog'}
          hasPassword={isAuthAvailable()}
          onLogout={handleLogout}
        />

        {/* Outer scrolling layout wrapper */}
        <div className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="h-full"
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
