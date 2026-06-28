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
import { Product, Customer, Sale, BrandConfig, CashEntry } from './types';
import { 
  getProducts, saveProduct, deleteProduct,
  getCustomers, saveCustomer, deleteCustomer,
  getSales, saveSale, deleteSale,
  getCashEntries, saveCashEntry,
  getBrandConfig, saveBrandConfig,
  seedInitialData, getStorageMode, setStorageMode, updateCashFlowFromSales
} from './lib/db';
import { firebaseEnabled } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [openCustomerModalOnLoad, setOpenCustomerModalOnLoad] = useState(false);
  const [isPublicCatalog, setIsPublicCatalog] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true';
  });

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
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

      // Load products
      let prodList = await getProducts();
      
      // Auto-seed with beautiful demo data on very first launch if database is empty
      if (prodList.length === 0) {
        console.log('Database empty. Seeding initial demo semijoias data...');
        await seedInitialData(false);
        prodList = await getProducts();
      }
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isCatalog = params.get('catalog') === 'true';
    if (!brandConfig.adminPassword && !isCatalog) {
      sessionStorage.setItem('admin_authenticated', 'true');
      setIsAuthenticated(true);
    }
  }, [brandConfig.adminPassword]);

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
    // Decrement stock for each item in the sale
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod && prod.estoque !== undefined && prod.estoque !== null) {
          const updatedEstoque = Math.max(0, prod.estoque - item.quantity);
          await saveProduct({
            ...prod,
            estoque: updatedEstoque
          });
        }
      }
      // Reload products list after decrementing stock
      const prodList = await getProducts();
      setProducts(prodList);
    }

    await saveSale(sale);
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
            firebaseAvailable={firebaseEnabled}
            onSaveConfig={handleSaveBrandConfig}
            onSeedData={handleSeedData}
            onToggleStorageMode={handleToggleStorageMode}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div id="loading-screen" className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 p-6">
        <div className="relative mb-4">
          <RefreshCw className="w-12 h-12 text-amber-600 animate-spin" />
          <Sparkles className="w-5 h-5 text-amber-400 absolute top-1 right-1 animate-pulse" />
        </div>
        <p className="font-serif font-bold text-neutral-800 text-lg tracking-wide animate-pulse">
          Brilho Raro Semijoias
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

  if (brandConfig.adminPassword && !isAuthenticated) {
    return (
      <AdminLogin 
        brandConfig={brandConfig} 
        onLoginSuccess={() => setIsAuthenticated(true)} 
      />
    );
  }

  return (
    <div id="app-layout" className="min-h-screen bg-brand-porcelain flex flex-col md:flex-row text-neutral-800 font-sans">
      
      {/* Navigation Layer */}
      <Navbar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        storageMode={storageModeState} 
        hasPassword={!!brandConfig.adminPassword}
        onLogout={handleLogout}
      />

      {/* Main Panel Content */}
      <main id="main-content" className="flex-1 flex flex-col min-h-screen md:max-h-screen md:overflow-y-auto">
        
        {/* Dynamic header size depending on whether catalog tab is open */}
        <Header 
          brandConfig={brandConfig} 
          isCompact={activeTab !== 'catalog'} 
          hasPassword={!!brandConfig.adminPassword}
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
