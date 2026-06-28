/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Product, Customer, Sale, CashEntry, BrandConfig } from '../types';
import { TabId } from './Navbar';
import { 
  Sparkles, TrendingUp, DollarSign, Users, ShoppingBag, 
  PackageX, AlertCircle, Calendar, ArrowUpRight, ArrowDownLeft, 
  MessageCircle, Percent, ChevronRight
} from 'lucide-react';

interface DashboardHomeProps {
  cashEntries: CashEntry[];
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  brandConfig: BrandConfig;
  onTabChange: (tab: TabId) => void;
}

export default function DashboardHome({
  cashEntries,
  sales,
  products,
  customers,
  brandConfig,
  onTabChange
}: DashboardHomeProps) {
  
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // 1.1 Dynamic Greeting and Portuguese Date
  const greeting = useMemo(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Bom dia';
    if (hrs < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const formattedDate = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const dateStr = new Date().toLocaleDateString('pt-BR', options);
    // Capitalize first letter
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }, []);

  // 1.2 KPIs calculation
  const kpiData = useMemo(() => {
    const hoje = new Date();
    
    // Vendas hoje: Soma das vendas do dia atual (vendas confirmadas, exlui 'order')
    const salesToday = sales.filter(s => {
      if (s.status === 'order') return false;
      const saleDate = new Date(s.createdAt || s.date);
      return saleDate.getFullYear() === hoje.getFullYear() &&
             saleDate.getMonth() === hoje.getMonth() &&
             saleDate.getDate() === hoje.getDate();
    });
    const totalSalesToday = salesToday.reduce((sum, s) => sum + s.totalAmount, 0);
    const countSalesToday = salesToday.length;

    // Saldo de caixa: Total recebido − saídas
    let totalInflow = 0;
    let totalOutflow = 0;
    cashEntries.forEach(entry => {
      if (entry.type === 'in') {
        totalInflow += entry.amount;
      } else {
        totalOutflow += entry.amount;
      }
    });
    const cashBalance = totalInflow - totalOutflow;

    // Fiado a receber: Soma dos saldos devedores de vendas com status pending ou partial
    let pendingFiadoVal = 0;
    sales.forEach(s => {
      if (s.status === 'order') return;
      if (s.status === 'pending' || s.status === 'partial') {
        pendingFiadoVal += s.outstandingBalance !== undefined ? s.outstandingBalance : s.totalAmount;
      }
    });

    // Total sales faturamento for percentage limit
    const totalSalesAll = sales.reduce((sum, s) => s.status !== 'order' ? sum + s.totalAmount : sum, 0);
    const isFiadoHigh = totalSalesAll > 0 && (pendingFiadoVal / totalSalesAll) > 0.3;

    // Sem estoque: Contagem de semijoias com estoque = 0 (only if estoque is not null/undefined)
    const outOfStockCount = products.filter(p => p.estoque === 0).length;

    return {
      totalSalesToday,
      countSalesToday,
      cashBalance,
      pendingFiadoVal,
      isFiadoHigh,
      outOfStockCount
    };
  }, [sales, cashEntries, products]);

  // 1.3 Box: Fiados vencendo calculation
  const lateFiadoCustomers = useMemo(() => {
    const customerStats: Record<string, { pendingDebt: number; lastPurchaseDate: string | null }> = {};
    
    customers.forEach(c => {
      customerStats[c.id] = { pendingDebt: 0, lastPurchaseDate: null };
    });

    sales.forEach(sale => {
      if (sale.status === 'order') return;
      const cId = sale.customerId;
      if (!customerStats[cId]) return;

      if (sale.status === 'pending' || sale.status === 'partial') {
        customerStats[cId].pendingDebt += sale.outstandingBalance !== undefined ? sale.outstandingBalance : sale.totalAmount;
      }

      // Check last purchase date
      const saleDate = sale.date;
      const currentLast = customerStats[cId].lastPurchaseDate;
      if (!currentLast || saleDate > currentLast) {
        customerStats[cId].lastPurchaseDate = saleDate;
      }
    });

    const activeDebtors = customers
      .map(c => {
        const stats = customerStats[c.id] || { pendingDebt: 0, lastPurchaseDate: null };
        let daysCount = 0;
        if (stats.lastPurchaseDate) {
          const lastDate = new Date(stats.lastPurchaseDate + 'T12:00:00');
          const today = new Date();
          today.setHours(12, 0, 0, 0);
          const diffTime = today.getTime() - lastDate.getTime();
          daysCount = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        }
        return {
          customer: c,
          pendingDebt: stats.pendingDebt,
          lastPurchaseDate: stats.lastPurchaseDate,
          daysCount
        };
      })
      .filter(item => item.pendingDebt > 0)
      // Ordenados por data de última compra (mais antigos primeiro = maior daysCount primeiro)
      .sort((a, b) => b.daysCount - a.daysCount);

    return activeDebtors;
  }, [customers, sales]);

  // Helper to open WhatsApp collection message
  const handleWhatsAppCobrança = (c: Customer, value: number) => {
    const formattedPhone = c.phone.replace(/\D/g, '');
    const cleanPhone = formattedPhone.startsWith('55') ? formattedPhone : '55' + formattedPhone;
    const text = `Olá ${c.name}, tudo bem? Passando para lembrar que você tem um saldo de R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em aberto com a ${brandConfig.brandName}. Quando puder, me avise! 💛`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  // 1.4 Box: Mais vendidos do mês calculation
  const topMonthData = useMemo(() => {
    const hoje = new Date();
    
    // Filter sales in current month
    const salesThisMonth = sales.filter(s => {
      if (s.status === 'order') return false;
      const saleDate = new Date(s.createdAt || s.date);
      return saleDate.getFullYear() === hoje.getFullYear() &&
             saleDate.getMonth() === hoje.getMonth();
    });

    // Count product quantity
    const productQtyMap: Record<string, number> = {};
    salesThisMonth.forEach(sale => {
      sale.items.forEach(item => {
        productQtyMap[item.productId] = (productQtyMap[item.productId] || 0) + item.quantity;
      });
    });

    // Get product info and sort
    const topProducts = Object.entries(productQtyMap)
      .map(([prodId, qty]) => {
        const prod = products.find(p => p.id === prodId);
        return {
          product: prod,
          quantity: qty
        };
      })
      .filter(item => item.product !== undefined)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);

    // Month faturamento & fiado proportion
    let monthSalesTotal = 0;
    let monthFiadoTotal = 0;

    salesThisMonth.forEach(s => {
      monthSalesTotal += s.totalAmount;
      if (s.status === 'pending' || s.status === 'partial') {
        monthFiadoTotal += s.outstandingBalance !== undefined ? s.outstandingBalance : s.totalAmount;
      }
    });

    const monthCashTotal = monthSalesTotal - monthFiadoTotal;
    const cashPct = monthSalesTotal > 0 ? (monthCashTotal / monthSalesTotal) * 100 : 0;
    const fiadoPct = monthSalesTotal > 0 ? (monthFiadoTotal / monthSalesTotal) * 100 : 0;

    return {
      topProducts,
      monthSalesTotal,
      monthFiadoTotal,
      monthCashTotal,
      cashPct,
      fiadoPct
    };
  }, [sales, products]);

  return (
    <div id="dashboard-home-container" className="space-y-6 pb-24">
      {/* 1.1 Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white rounded-3xl p-6 border border-brand-stone/30 shadow-xs">
        <div className="space-y-1">
          <h2 className="font-serif font-bold text-2xl text-neutral-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-rosewood fill-brand-rosewood/20" />
            {greeting}, {brandConfig.brandName}! ✨
          </h2>
          <p className="text-xs text-neutral-500 font-medium">{formattedDate}</p>
        </div>
        <div className="text-xs font-semibold px-4 py-2 bg-brand-accent-light text-brand-accent-hover rounded-full border border-brand-stone/30">
          Painel de Controle Principal
        </div>
      </div>

      {/* 1.2 KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Vendas Hoje */}
        <div className="bg-white rounded-2xl border border-brand-stone/30 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <span className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider block">Vendas Hoje</span>
              <span className="text-2xl font-black text-neutral-800">
                {formatBRL(kpiData.totalSalesToday)}
              </span>
            </div>
            <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl border border-emerald-100">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5 mt-2">
            <span className="text-[10px] text-neutral-400 font-medium">Faturamento diário</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
              {kpiData.countSalesToday} ped.
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* KPI 2: Saldo de Caixa */}
        <div className="bg-white rounded-2xl border border-brand-stone/30 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <span className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider block">Saldo de Caixa</span>
              <span className={`text-2xl font-black ${kpiData.cashBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatBRL(kpiData.cashBalance)}
              </span>
            </div>
            <div className="bg-brand-accent-light text-brand-accent-hover p-2.5 rounded-xl border border-brand-stone/25">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5 mt-2">
            <span className="text-[10px] text-neutral-400 font-medium">Livro caixa consolidado</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${kpiData.cashBalance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {kpiData.cashBalance >= 0 ? 'Positivo' : 'Negativo'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-rosewood" />
        </div>

        {/* KPI 3: Fiado a Receber */}
        <div className="bg-white rounded-2xl border border-brand-stone/30 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <span className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider block">Fiado Ativo</span>
              <span className="text-2xl font-black text-red-600">
                {formatBRL(kpiData.pendingFiadoVal)}
              </span>
            </div>
            <div className="bg-red-50 text-red-600 p-2.5 rounded-xl border border-red-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5 mt-2">
            <span className="text-[10px] text-neutral-400 font-medium">Saldo devedor pendente</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${kpiData.isFiadoHigh ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-red-50 text-red-600'}`}>
              {kpiData.isFiadoHigh ? 'Risco Alto (>30%)' : 'Estável'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />
        </div>

        {/* KPI 4: Sem Estoque */}
        <div className="bg-white rounded-2xl border border-brand-stone/30 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <span className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider block">Sem Estoque</span>
              <span className={`text-2xl font-black ${kpiData.outOfStockCount > 0 ? 'text-red-600' : 'text-neutral-800'}`}>
                {kpiData.outOfStockCount} <span className="text-xs font-normal text-neutral-400">peças</span>
              </span>
            </div>
            <div className={`p-2.5 rounded-xl border ${kpiData.outOfStockCount > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-neutral-50 text-neutral-400 border-neutral-150'}`}>
              <PackageX className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5 mt-2">
            <span className="text-[10px] text-neutral-400 font-medium">Necessitam reposição</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${kpiData.outOfStockCount > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {kpiData.outOfStockCount > 0 ? 'Atenção' : 'Tudo OK'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-400" />
        </div>
      </div>

      {/* Grid: 1.3 Box Fiados Vencendo (Left) & 1.4 Box Top Vendas/Proporção (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box Left: Fiados vencendo */}
        <div className="bg-white rounded-3xl border border-brand-stone/30 p-5 shadow-xs flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-neutral-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-neutral-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Fiados em Aberto
              </h3>
              <button 
                onClick={() => onTabChange('customers')}
                className="text-xs text-brand-accent-hover hover:underline flex items-center font-semibold cursor-pointer"
              >
                Ver todas
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {lateFiadoCustomers.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-neutral-400">
                <Sparkles className="w-8 h-8 text-emerald-500 mb-2 fill-emerald-50" />
                <span>Excelente! Não há clientes com fiados ativos no momento.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {lateFiadoCustomers.slice(0, 4).map((item, idx) => {
                  // Determine dot color
                  let dotColor = 'bg-yellow-400';
                  if (item.daysCount > 30) dotColor = 'bg-red-500 animate-pulse';
                  else if (item.daysCount >= 15) dotColor = 'bg-amber-500';

                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50/50 hover:bg-neutral-50 rounded-xl border border-neutral-100 transition-colors">
                      <div className="flex items-center space-x-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                        <div>
                          <p className="text-xs font-bold text-neutral-800">{item.customer.name}</p>
                          <p className="text-[10px] text-neutral-400">
                            Compra há {item.daysCount} dias ({item.lastPurchaseDate ? new Date(item.lastPurchaseDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data'})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-black text-red-600">
                          {formatBRL(item.pendingDebt)}
                        </span>
                        <button
                          onClick={() => handleWhatsAppCobrança(item.customer, item.pendingDebt)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-all cursor-pointer"
                          title="Enviar cobrança via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-neutral-100 pt-3 mt-4 text-[11px] text-neutral-400 italic">
            * Ordenado por tempo desde a última compra (mais antigos no topo)
          </div>
        </div>

        {/* Box Right: Mais vendidos do mês e Proporção */}
        <div className="bg-white rounded-3xl border border-brand-stone/30 p-5 shadow-xs flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-neutral-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-neutral-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-rosewood" />
                Destaques do Mês Atual
              </h3>
              <button 
                onClick={() => onTabChange('catalog')}
                className="text-xs text-brand-accent-hover hover:underline flex items-center font-semibold cursor-pointer"
              >
                Ir ao Catálogo
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {topMonthData.topProducts.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-center text-xs text-neutral-400">
                <ShoppingBag className="w-8 h-8 text-neutral-200 mb-2" />
                <span>Nenhuma venda registrada neste mês ainda.</span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {topMonthData.topProducts.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-neutral-50/30 border border-neutral-100/50">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={item.product?.imageUrl} 
                        alt={item.product?.name} 
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-cover rounded-lg border border-neutral-200"
                      />
                      <div>
                        <p className="text-xs font-bold text-neutral-800 leading-tight">{item.product?.name}</p>
                        <p className="text-[10px] text-neutral-500">{item.product?.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-brand-accent-light text-brand-accent-hover text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {item.quantity} vendidas
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Proporção Caixa vs Fiado do mês */}
          <div className="border-t border-neutral-100 pt-4 mt-4 space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-neutral-700 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-brand-rosewood" />
                Proporção Caixa × Fiado (Mês)
              </span>
              <span className="text-neutral-400 font-normal">
                {formatBRL(topMonthData.monthSalesTotal)} faturamento
              </span>
            </div>

            {topMonthData.monthSalesTotal === 0 ? (
              <p className="text-[11px] text-neutral-400 text-center">Nenhum faturamento registrado no mês para cálculo de proporção.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    À Vista (Caixa): {formatBRL(topMonthData.monthCashTotal)} ({topMonthData.cashPct.toFixed(1)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    Fiado: {formatBRL(topMonthData.monthFiadoTotal)} ({topMonthData.fiadoPct.toFixed(1)}%)
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden flex border border-neutral-200/50">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${topMonthData.cashPct}%` }}
                    title={`À Vista: ${topMonthData.cashPct.toFixed(1)}%`}
                  />
                  <div 
                    className="bg-red-400 h-full transition-all duration-500" 
                    style={{ width: `${topMonthData.fiadoPct}%` }}
                    title={`Fiado: ${topMonthData.fiadoPct.toFixed(1)}%`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
