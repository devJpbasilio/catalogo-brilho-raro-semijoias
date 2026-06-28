/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutDashboard, Grid, ShoppingBag, Users, TrendingUp, Settings, HelpCircle, LogOut } from 'lucide-react';

export type TabId = 'dashboard' | 'catalog' | 'sales' | 'customers' | 'financial' | 'settings';

interface NavbarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  storageMode: 'cloud' | 'local';
  hasPassword?: boolean;
  onLogout?: () => void;
}

export default function Navbar({ activeTab, onTabChange, storageMode, hasPassword, onLogout }: NavbarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'catalog', label: 'Catálogo', icon: Grid },
    { id: 'sales', label: 'Vendas', icon: ShoppingBag },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'financial', label: 'Financeiro', icon: TrendingUp },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ] as const;

  return (
    <>
      {/* Desktop Sidebar / Top Header (Hidden on Mobile) */}
      <aside id="desktop-nav" className="hidden md:flex flex-col w-64 bg-[#2B2332] border-r border-[#3D2E42] h-screen sticky top-0 py-6 px-4 shrink-0">
        <div className="px-3 mb-8">
          <div className="flex items-center space-x-2 text-white mb-1">
            <ShoppingBag className="w-6 h-6 text-[#C4708A] fill-[#C4708A]/10" />
            <span className="font-serif font-bold text-xl tracking-wide text-white">Semijoias Pro</span>
          </div>
          <p className="text-[11px] text-neutral-300 font-medium">Sistema de Gestão & Catálogo</p>
          
          <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#3D2E42] border border-[#E8D5DC]/10 text-xs text-neutral-200">
            <span className={`w-2 h-2 rounded-full ${storageMode === 'cloud' ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
            {storageMode === 'cloud' ? 'Nuvem Firestore' : 'Armazenamento Local'}
          </div>
        </div>

        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                id={`nav-desktop-${item.id}`}
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#3D2E42] text-white shadow-sm border-l-4 border-[#C4708A] font-semibold'
                    : 'text-neutral-300 hover:bg-[#3D2E42]/55 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#C4708A]' : 'text-neutral-400 group-hover:text-neutral-200'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-[#3D2E42] text-xs text-neutral-400 px-3 space-y-3">
          {hasPassword && onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-2 px-3 py-2 text-red-400 hover:bg-red-950/30 hover:text-red-300 font-semibold text-xs rounded-lg transition-all cursor-pointer border border-transparent"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair do Painel</span>
            </button>
          )}
          <div>
            <span className="block font-medium text-neutral-300">Desenvolvido para</span>
            <span>Sellers Independentes v1.0</span>
          </div>
        </div>
      </aside>

      {/* Mobile Floating Bottom Bar (Hidden on Desktop) */}
      <div id="mobile-nav" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#2B2332]/95 backdrop-blur-md border-t border-[#3D2E42] shadow-[0_-4px_16px_rgba(0,0,0,0.2)] px-2 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                id={`nav-mobile-${item.id}`}
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="flex flex-col items-center justify-center flex-1 py-1 px-1.5 text-center relative focus:outline-none cursor-pointer"
              >
                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-[#3D2E42] text-[#C4708A] scale-110 shadow-sm' 
                    : 'text-neutral-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[9px] tracking-tight mt-0.5 transition-colors ${
                  isActive 
                    ? 'text-white font-bold' 
                    : 'text-neutral-400 font-medium'
                }`}>
                  {item.label}
                </span>
                
                {/* Visual active dot indicator */}
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 bg-[#C4708A] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
