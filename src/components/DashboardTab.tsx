/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { CashEntry, Sale, Product } from '../types';
import { 
  DollarSign, TrendingUp, ArrowDownLeft, ArrowUpRight, Plus, 
  Trash2, Search, Calendar, FileText, BarChart2, PieChart, Sparkles, X, Clock
} from 'lucide-react';

interface DashboardTabProps {
  cashEntries: CashEntry[];
  sales: Sale[];
  products: Product[];
  onAddCashEntry: (entry: CashEntry) => Promise<void>;
}

export default function DashboardTab({
  cashEntries,
  sales,
  products,
  onAddCashEntry
}: DashboardTabProps) {
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashSearch, setCashSearch] = useState('');

  // Manual cash entry form state
  const [entryType, setEntryType] = useState<'in' | 'out'>('out');
  const [entryAmount, setEntryAmount] = useState<number>(0);
  const [entryDescription, setEntryDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryPaymentMethod, setEntryPaymentMethod] = useState<'pix' | 'card' | 'cash' | 'fiado'>('cash');

  // Selectors for interactive daily and monthly consolidated views
  const [selectedDailyDate, setSelectedDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonthlyMonth, setSelectedMonthlyMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleAmountChange = (inputValue: string) => {
    const cleanValue = inputValue.replace(/\D/g, '');
    if (cleanValue === '') {
      setEntryAmount(0);
      return;
    }
    const numericValue = parseFloat(cleanValue) / 100;
    setEntryAmount(numericValue);
  };

  // Calculations for Financial summary
  const financeSummary = useMemo(() => {
    let totalSalesVal = 0;
    let pendingFiadoVal = 0;
    
    // Calculate total sales and pending credit
    sales.forEach(s => {
      if (s.status === 'order') return; // exclude raw catalog orders from faturamento
      totalSalesVal += s.totalAmount;
      if (s.status === 'pending' || s.status === 'partial') {
        pendingFiadoVal += s.outstandingBalance !== undefined ? s.outstandingBalance : s.totalAmount;
      }
    });

    // Calculate cash book totals
    let totalInflow = 0;
    let totalOutflow = 0;

    // Grouping totals by payment method (entradas/inflow only)
    let pixInflow = 0;
    let cardInflow = 0;
    let cashInflow = 0;
    let fiadoInflow = 0;

    cashEntries.forEach(entry => {
      if (entry.type === 'in') {
        totalInflow += entry.amount;
        const method = entry.paymentMethod || 'cash';
        if (method === 'pix') pixInflow += entry.amount;
        else if (method === 'card') cardInflow += entry.amount;
        else if (method === 'cash') cashInflow += entry.amount;
        else if (method === 'fiado') fiadoInflow += entry.amount;
      } else {
        totalOutflow += entry.amount;
      }
    });

    const netCashBalance = totalInflow - totalOutflow;

    // Helper to safely parse date components (year, month, day) bypassing timezone differences
    const parseDateComponents = (dateStr: string) => {
      if (!dateStr) return null;
      // If contains 'T', it is an ISO string. Let's take the first part
      const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        return {
          year: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10),
          day: parseInt(parts[2], 10)
        };
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate()
      };
    };

    // Daily Consolidation for selectedDailyDate using safe component comparison
    let dailyIn = 0;
    let dailyOut = 0;
    const targetComp = parseDateComponents(selectedDailyDate);
    
    cashEntries.forEach(entry => {
      const entryComp = parseDateComponents(entry.date);
      if (targetComp && entryComp && 
          entryComp.year === targetComp.year && 
          entryComp.month === targetComp.month && 
          entryComp.day === targetComp.day) {
        if (entry.type === 'in') dailyIn += entry.amount;
        else dailyOut += entry.amount;
      }
    });

    // Monthly Consolidation for selectedMonthlyMonth (format "YYYY-MM") using safe component comparison
    let monthlyIn = 0;
    let monthlyOut = 0;
    const monthlyParts = selectedMonthlyMonth.split('-');
    const targetYear = monthlyParts[0] ? parseInt(monthlyParts[0], 10) : null;
    const targetMonth = monthlyParts[1] ? parseInt(monthlyParts[1], 10) : null;

    cashEntries.forEach(entry => {
      const entryComp = parseDateComponents(entry.date);
      if (entryComp && targetYear && targetMonth &&
          entryComp.year === targetYear &&
          entryComp.month === targetMonth) {
        if (entry.type === 'in') monthlyIn += entry.amount;
        else monthlyOut += entry.amount;
      }
    });

    return {
      totalSales: totalSalesVal,
      pendingFiado: pendingFiadoVal,
      cashBalance: netCashBalance,
      cashIn: totalInflow,
      cashOut: totalOutflow,
      byMethod: {
        pix: pixInflow,
        card: cardInflow,
        cash: cashInflow,
        fiado: fiadoInflow
      },
      daily: {
        in: dailyIn,
        out: dailyOut,
        balance: dailyIn - dailyOut
      },
      monthly: {
        in: monthlyIn,
        out: monthlyOut,
        balance: monthlyIn - monthlyOut
      }
    };
  }, [sales, cashEntries, selectedDailyDate, selectedMonthlyMonth]);

  // Group sales by category for a visual breakdown
  const salesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        // Find product to check category if not on item (we saved productName, but wait, let's map by product ID or look up from catalog)
        const prod = products.find(p => p.id === item.productId);
        const cat = prod ? prod.category : 'Outros';
        
        map[cat] = (map[cat] || 0) + (item.price * item.quantity);
      });
    });

    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [sales, products]);

  // Calculate highest category value for scaling charts
  const maxCategoryValue = useMemo(() => {
    if (salesByCategory.length === 0) return 1;
    return Math.max(...salesByCategory.map(c => c.value));
  }, [salesByCategory]);

  // Payment methods chart data memoization
  const paymentMethodsData = useMemo(() => {
    return [
      { name: 'Pix', value: financeSummary.byMethod.pix, color: 'bg-[#C4708A]' },
      { name: 'Cartão', value: financeSummary.byMethod.card, color: 'bg-indigo-400' },
      { name: 'Dinheiro', value: financeSummary.byMethod.cash, color: 'bg-emerald-500' },
      { name: 'Fiado Quitado', value: financeSummary.byMethod.fiado, color: 'bg-amber-500' }
    ];
  }, [financeSummary]);

  const totalPaymentInflow = useMemo(() => {
    return financeSummary.byMethod.pix + financeSummary.byMethod.card + financeSummary.byMethod.cash + financeSummary.byMethod.fiado;
  }, [financeSummary]);

  const maxPaymentValue = useMemo(() => {
    const vals = paymentMethodsData.map(d => d.value);
    return Math.max(...vals, 1);
  }, [paymentMethodsData]);

  // Filtered Cash Entries for search
  const filteredCashEntries = useMemo(() => {
    return cashEntries.filter(entry => 
      entry.description.toLowerCase().includes(cashSearch.toLowerCase()) ||
      entry.amount.toString().includes(cashSearch) ||
      entry.date.includes(cashSearch)
    );
  }, [cashEntries, cashSearch]);

  // Handle manual cash entry submission
  const handleCashEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entryAmount <= 0) {
      alert('Por favor, insira um valor monetário maior que zero.');
      return;
    }

    if (!entryDescription.trim()) {
      alert('Por favor, insira uma descrição.');
      return;
    }

    const newEntry: CashEntry = {
      id: `cash_manual_${Math.random().toString(36).substring(2, 11)}`,
      type: entryType,
      amount: entryAmount,
      description: entryDescription.trim(),
      date: entryDate,
      createdAt: new Date().toISOString(),
      paymentMethod: entryPaymentMethod
    };

    await onAddCashEntry(newEntry);
    
    // Reset state & close
    setIsCashModalOpen(false);
    setEntryAmount(0);
    setEntryDescription('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setEntryPaymentMethod('cash');
  };

  // Export financial report to CSV
  const handleExportReport = () => {
    if (cashEntries.length === 0) {
      alert('Nenhuma movimentação financeira registrada para exportar.');
      return;
    }

    // Header row
    let csvContent = 'ID,Data,Tipo,Valor (R$),Meio de Pagamento,Descricao,Criado Em\n';

    // Data rows
    cashEntries.forEach(entry => {
      const typeLabel = entry.type === 'in' ? 'Entrada' : 'Saida';
      const paymentLabel = entry.paymentMethod || 'Dinheiro';
      const description = entry.description.replace(/"/g, '""');
      
      csvContent += `"${entry.id}","${entry.date}","${typeLabel}",${entry.amount},"${paymentLabel}","${description}","${entry.createdAt}"\n`;
    });

    // Create download link
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="dashboard-tab-container" className="space-y-6 pb-24">
      
      {/* Header Actions row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8D5DC] shadow-sm">
        <div>
          <h2 className="text-lg font-serif font-bold text-neutral-800">Painel Financeiro</h2>
          <p className="text-xs text-neutral-500">Acompanhe, faça a gestão do fluxo de caixa e exporte relatórios consolidados do seu negócio.</p>
        </div>
        <button
          type="button"
          onClick={handleExportReport}
          className="bg-[#C4708A] hover:bg-[#8B3A55] active:scale-98 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-center"
        >
          <FileText className="w-4 h-4" />
          <span>Exportar Relatório CSV</span>
        </button>
      </div>
      
      {/* High-Impact Financial Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Liquid Cash Balance (Caixa Geral) */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block">Saldo de Caixa Atual</span>
              <span className={`text-2xl font-black ${financeSummary.cashBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                R$ {financeSummary.cashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          
          <div className="text-[10px] text-neutral-400 flex justify-between border-t border-neutral-50 pt-2 mt-2">
            <span>Entradas: +R$ {financeSummary.cashIn.toLocaleString('pt-BR')}</span>
            <span className="text-red-500 font-medium">Saídas: -R$ {financeSummary.cashOut.toLocaleString('pt-BR')}</span>
          </div>
          
          {/* Subtle glow decorative bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-500" />
        </div>

        {/* Total Sales (Faturamento) */}
        <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block">Faturamento (Vendido)</span>
              <span className="text-2xl font-black text-neutral-800">
                R$ {financeSummary.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl border border-amber-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 flex items-center justify-between border-t border-neutral-50 pt-2 mt-2">
            <span>Soma de vendas à vista e fiados</span>
            <span className="text-amber-600 font-bold flex items-center gap-0.5">
              <Sparkles className="w-3 h-3 fill-amber-50" /> {sales.length} Vendas
            </span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-amber-500" />
        </div>

        {/* Outstanding Debt (Fiado Pendente) */}
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block">Fiado Ativo (A Receber)</span>
              <span className="text-2xl font-black text-red-600">
                R$ {financeSummary.pendingFiado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-red-50 text-red-600 p-2.5 rounded-xl border border-red-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 flex items-center justify-between border-t border-neutral-50 pt-2 mt-2">
            <span>Capital retido com clientes</span>
            <span className="text-red-500 font-semibold uppercase text-[9px] bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md">
              Atenção
            </span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-red-400" />
        </div>
      </div>

      {/* SEÇÃO: DETALHAMENTO DE ENTRADAS POR FORMA DE PAGAMENTO */}
      <div className="bg-white rounded-2xl border border-amber-50 p-5 shadow-xs">
        <h3 className="font-serif font-bold text-base text-neutral-800 flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-amber-600" />
          Entradas por Forma de Pagamento
        </h3>
        <p className="text-xs text-neutral-500 mb-4">Receitas acumuladas no Livro Caixa divididas por cada meio de pagamento.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-emerald-50/10 rounded-xl p-3 border border-neutral-150 flex flex-col justify-between">
            <span className="text-[10px] text-neutral-500 uppercase font-bold">Pix</span>
            <span className="text-base font-extrabold text-emerald-700 mt-1">{formatBRL(financeSummary.byMethod.pix)}</span>
          </div>
          <div className="bg-purple-50/10 rounded-xl p-3 border border-neutral-150 flex flex-col justify-between">
            <span className="text-[10px] text-neutral-500 uppercase font-bold">Cartão</span>
            <span className="text-base font-extrabold text-purple-700 mt-1">{formatBRL(financeSummary.byMethod.card)}</span>
          </div>
          <div className="bg-amber-50/10 rounded-xl p-3 border border-neutral-150 flex flex-col justify-between">
            <span className="text-[10px] text-neutral-500 uppercase font-bold">Dinheiro</span>
            <span className="text-base font-extrabold text-amber-700 mt-1">{formatBRL(financeSummary.byMethod.cash)}</span>
          </div>
          <div className="bg-rose-50/10 rounded-xl p-3 border border-neutral-150 flex flex-col justify-between">
            <span className="text-[10px] text-neutral-500 uppercase font-bold">Fiado Quitado</span>
            <span className="text-base font-extrabold text-rose-700 mt-1">{formatBRL(financeSummary.byMethod.fiado)}</span>
          </div>
        </div>
      </div>

      {/* SEÇÃO: VISÕES CONSOLIDADAS POR PERÍODO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Diário */}
        <div className="bg-white rounded-2xl border border-neutral-150 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="font-serif font-bold text-base text-neutral-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Consolidado Diário
            </h3>
            <input 
              type="date"
              value={selectedDailyDate}
              onChange={(e) => setSelectedDailyDate(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs text-neutral-700 focus:border-amber-500 outline-none"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-emerald-50/40 rounded-xl p-2.5 border border-emerald-100 text-center">
              <span className="text-[9px] text-emerald-700 font-bold uppercase block">Entradas</span>
              <span className="text-xs font-extrabold text-emerald-600 block mt-1">{formatBRL(financeSummary.daily.in)}</span>
            </div>
            <div className="bg-red-50/40 rounded-xl p-2.5 border border-red-100 text-center">
              <span className="text-[9px] text-red-700 font-bold uppercase block">Saídas</span>
              <span className="text-xs font-extrabold text-red-500 block mt-1">{formatBRL(financeSummary.daily.out)}</span>
            </div>
            <div className={`rounded-xl p-2.5 border text-center ${financeSummary.daily.balance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <span className="text-[9px] font-bold uppercase block">Saldo</span>
              <span className={`text-xs font-black block mt-1 ${financeSummary.daily.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatBRL(financeSummary.daily.balance)}
              </span>
            </div>
          </div>
        </div>

        {/* Total Mensal */}
        <div className="bg-white rounded-2xl border border-neutral-150 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="font-serif font-bold text-base text-neutral-800 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-amber-600" />
              Consolidado Mensal
            </h3>
            <input 
              type="month"
              value={selectedMonthlyMonth}
              onChange={(e) => setSelectedMonthlyMonth(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs text-neutral-700 focus:border-amber-500 outline-none"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-emerald-50/40 rounded-xl p-2.5 border border-emerald-100 text-center">
              <span className="text-[9px] text-emerald-700 font-bold uppercase block">Entradas</span>
              <span className="text-xs font-extrabold text-emerald-600 block mt-1">{formatBRL(financeSummary.monthly.in)}</span>
            </div>
            <div className="bg-red-50/40 rounded-xl p-2.5 border border-red-100 text-center">
              <span className="text-[9px] text-red-700 font-bold uppercase block">Saídas</span>
              <span className="text-xs font-extrabold text-red-500 block mt-1">{formatBRL(financeSummary.monthly.out)}</span>
            </div>
            <div className={`rounded-xl p-2.5 border text-center ${financeSummary.monthly.balance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <span className="text-[9px] font-bold uppercase block">Saldo</span>
              <span className={`text-xs font-black block mt-1 ${financeSummary.monthly.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatBRL(financeSummary.monthly.balance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Category breakdown visual chart */}
        <div className="bg-white rounded-2xl border border-[#E8D5DC] p-5 shadow-sm">
          <h3 className="font-serif font-bold text-base text-neutral-800 flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-[#C4708A]" />
            Faturamento por Categoria
          </h3>

          {salesByCategory.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center text-xs text-neutral-400">
              <BarChart2 className="w-10 h-10 text-neutral-200 mb-2" />
              <span>Nenhum dado de venda para exibir o gráfico.</span>
            </div>
          ) : (
            <div className="space-y-3.5 h-44 overflow-y-auto pr-1">
              {salesByCategory.map((cat, i) => {
                const pct = (cat.value / maxCategoryValue) * 100;
                const totalPct = (cat.value / financeSummary.totalSales) * 100;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-neutral-700">{cat.name}</span>
                      <span className="text-neutral-900">
                        R$ {cat.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        <span className="text-[10px] text-neutral-400 font-normal ml-1">({totalPct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    {/* SVG/Tailwind Progress Bar */}
                    <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden border border-neutral-200/50">
                      <div 
                        className="bg-[#C4708A] h-full rounded-full transition-all duration-700" 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods breakdown visual chart */}
        <div className="bg-white rounded-2xl border border-[#E8D5DC] p-5 shadow-sm">
          <h3 className="font-serif font-bold text-base text-neutral-800 flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-[#C4708A]" />
            Entradas por Forma de Pagamento
          </h3>

          {totalPaymentInflow === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center text-xs text-neutral-400">
              <BarChart2 className="w-10 h-10 text-[#E8D5DC] mb-2" />
              <span>Nenhum dado de entrada para exibir o gráfico.</span>
            </div>
          ) : (
            <div className="space-y-3.5 h-44 overflow-y-auto pr-1">
              {paymentMethodsData.map((pay, i) => {
                const pct = (pay.value / maxPaymentValue) * 100;
                const totalPct = totalPaymentInflow > 0 ? (pay.value / totalPaymentInflow) * 100 : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-neutral-700">{pay.name}</span>
                      <span className="text-neutral-900">
                        R$ {pay.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        <span className="text-[10px] text-neutral-400 font-normal ml-1">({totalPct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden border border-neutral-200/50">
                      <div 
                        className={`${pay.color} h-full rounded-full transition-all duration-700`} 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cash flow distribution visual */}
        <div className="bg-white rounded-2xl border border-[#E8D5DC] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif font-bold text-base text-neutral-800 flex items-center gap-2 mb-4">
              <BarChart2 className="w-5 h-5 text-[#C4708A]" />
              Proporção de Recebimento
            </h3>
            
            {financeSummary.totalSales === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-center text-xs text-neutral-400">
                <span>Registre vendas para ver a proporção de fiado vs caixa.</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Recebido À Vista
                    </span>
                    <span className="font-bold text-neutral-800">
                      {((financeSummary.totalSales - financeSummary.pendingFiado) / financeSummary.totalSales * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#C4708A] font-semibold flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C4708A]"></span> Pendente no Fiado
                    </span>
                    <span className="font-bold text-neutral-800">
                      {(financeSummary.pendingFiado / financeSummary.totalSales * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Compound Progress Bar */}
                <div className="w-full bg-[#F9E0E8] h-6 rounded-xl overflow-hidden flex shadow-xs border border-[#E8D5DC]">
                  <div 
                    className="bg-emerald-500 h-full text-[10px] font-bold text-white flex items-center justify-center"
                    style={{ width: `${((financeSummary.totalSales - financeSummary.pendingFiado) / financeSummary.totalSales * 100)}%` }}
                  >
                    {financeSummary.totalSales - financeSummary.pendingFiado > 0 ? 'Caixa' : ''}
                  </div>
                  <div 
                    className="bg-[#C4708A] h-full text-[10px] font-bold text-white flex items-center justify-center"
                    style={{ width: `${(financeSummary.pendingFiado / financeSummary.totalSales * 100)}%` }}
                  >
                    {financeSummary.pendingFiado > 0 ? 'Fiado' : ''}
                  </div>
                </div>
              </div>
            )}
          </div>

          {(() => {
            const fiadoPct = financeSummary.totalSales > 0 ? (financeSummary.pendingFiado / financeSummary.totalSales * 100) : 0;
            let adviceTip = "";
            let adviceColor = "bg-neutral-50 text-neutral-500 border-neutral-150";

            if (fiadoPct > 40) {
              adviceTip = "Alerta: Seu risco de inadimplência está alto. Evite novas vendas no fiado para estes clientes.";
              adviceColor = "bg-red-50 text-red-750 border-red-150";
            } else if (fiadoPct >= 15) {
              adviceTip = "Atenção: Monitore os fiados ativos e faça cobranças preventivas.";
              adviceColor = "bg-amber-50 text-amber-750 border-amber-150";
            } else {
              adviceTip = "Excelente! Sua operação está saudável e o caixa está sob controle.";
              adviceColor = "bg-emerald-50 text-emerald-750 border-emerald-150";
            }

            return (
              <div className={`${adviceColor} rounded-xl p-3 border text-[11px] leading-normal mt-4`}>
                💡 <strong>Dica do Consultor ({fiadoPct.toFixed(0)}% Fiado):</strong> {adviceTip}
              </div>
            );
          })()}
        </div>
      </div>

      {/* DIGITAL CASH BOOK ("LIVRO CAIXA") */}
      <div className="bg-white rounded-2xl border border-amber-50 p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif font-bold text-lg text-neutral-800 flex items-center gap-2">
              <FileText className="w-5.5 h-5.5 text-amber-600" />
              Livro Caixa (Fluxo Financeiro)
            </h3>
            <p className="text-xs text-neutral-500">Histórico detalhado de todas as entradas, retiradas e vendas quitadas.</p>
          </div>

          <button
            id="btn-add-cash-entry"
            onClick={() => setIsCashModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Lançar Movimentação Manual
          </button>
        </div>

        {/* Search entry log */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <input
            id="cash-entry-search"
            type="text"
            placeholder="Filtrar lançamentos..."
            value={cashSearch}
            onChange={(e) => setCashSearch(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:border-amber-500 outline-none text-neutral-800"
          />
        </div>

        {/* Entries list table */}
        {filteredCashEntries.length === 0 ? (
          <div className="border border-dashed border-neutral-200 rounded-2xl p-8 text-center text-xs text-neutral-400 bg-neutral-50/20">
            Nenhum lançamento de caixa registrado para o filtro atual.
          </div>
        ) : (
          <div className="border border-neutral-150 rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-150 font-bold text-neutral-600">
                    <th className="p-3">Data</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredCashEntries.map((entry) => (
                    <tr id={`cash-entry-${entry.id}`} key={entry.id} className="hover:bg-neutral-50/50 transition-all text-neutral-700">
                      <td className="p-3 whitespace-nowrap font-medium text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-neutral-800">
                        {entry.description}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          entry.type === 'in'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {entry.type === 'in' ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-600 stroke-[3]" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3 text-red-600 stroke-[3]" />
                          )}
                          {entry.type === 'in' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className={`p-3 text-right font-bold text-sm ${entry.type === 'in' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {entry.type === 'in' ? '+' : '-'} R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MANUAL CASH ENTRY MODAL */}
      {isCashModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCashModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif font-bold text-xl text-neutral-800 flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-amber-600" />
              Lançar Movimentação Manual
            </h3>

            <form onSubmit={handleCashEntrySubmit} className="space-y-4">
              
              {/* Entry Type (Inflow or Outflow) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Tipo de Movimentação *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEntryType('in')}
                    className={`py-3.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      entryType === 'in'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-350 shadow-xs font-extrabold'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    Entrada (Aporte/Ajuste)
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntryType('out')}
                    className={`py-3.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      entryType === 'out'
                        ? 'bg-red-50 text-red-800 border-red-350 shadow-xs font-extrabold'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-red-600 stroke-[2.5]" />
                    Saída (Retirada/Despesa)
                  </button>
                </div>
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Data *</label>
                  <input
                    id="manual-cash-date"
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:border-amber-500 outline-none text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Valor (R$) *</label>
                  <input
                    id="manual-cash-amount"
                    type="text"
                    required
                    value={formatBRL(entryAmount)}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm focus:border-amber-500 outline-none text-neutral-850 font-bold"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Forma de Pagamento *</label>
                <select
                  id="manual-cash-payment-method"
                  value={entryPaymentMethod}
                  onChange={(e) => setEntryPaymentMethod(e.target.value as any)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:border-amber-500 outline-none text-neutral-800"
                >
                  <option value="cash">Dinheiro</option>
                  <option value="pix">Pix</option>
                  <option value="card">Cartão</option>
                  <option value="fiado">Fiado</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Descrição do Lançamento *</label>
                <input
                  id="manual-cash-desc"
                  type="text"
                  required
                  placeholder="Ex: Compra de embalagens de veludo, ajuste de caixa..."
                  value={entryDescription}
                  onChange={(e) => setEntryDescription(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 outline-none text-neutral-850"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashModalOpen(false)}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-700 font-semibold text-sm py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-semibold text-sm py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Lançar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple custom inline helper clock icon since lucide-react standard may have slight variations
function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
