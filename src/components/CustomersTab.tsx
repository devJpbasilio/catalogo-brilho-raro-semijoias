/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Sale, Installment } from '../types';
import { 
  User, Plus, Search, Phone, History, DollarSign, Calendar, 
  Trash2, Edit3, X, CheckCircle2, MessageSquare, AlertTriangle, Eye,
  ChevronDown, ChevronUp, Clock, Check, MessageCircle, ShoppingBag
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface CustomersTabProps {
  customers: Customer[];
  sales: Sale[];
  onAddCustomer: (customer: Customer) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onUpdateSale: (sale: Sale) => Promise<void>;
  openCustomerModalOnLoad?: boolean;
  onResetCustomerModalTrigger?: () => void;
}

// Helper to get public URL origin for clients, replacing private dev URLs with public preview URLs
function getPublicOrigin(): string {
  const origin = window.location.origin;
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin;
}

export default function CustomersTab({
  customers,
  sales,
  onAddCustomer,
  onDeleteCustomer,
  onUpdateSale,
  openCustomerModalOnLoad,
  onResetCustomerModalTrigger
}: CustomersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [editingCust, setEditingCust] = useState<Customer | null>(null);
  const [selectedCustId, setSelectedCustId] = useState<string | null>(null);
  const [expandedSales, setExpandedSales] = useState<Record<string, boolean>>({});

  // New/Edit Customer form
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');

  // Settle Debt form
  const [settleAmount, setSettleAmount] = useState('');

  // Confirmation dialog state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    isDanger: false,
    onConfirm: () => {}
  });

  // Toggle sale row expansion in purchase history
  const toggleExpandSale = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSales(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Map outstanding debt balances and sales history per customer
  const customerDebtsAndStats = useMemo(() => {
    const map: Record<string, { totalBought: number; pendingDebt: number; salesList: Sale[] }> = {};

    // Initialize all customers
    customers.forEach(c => {
      map[c.id] = { totalBought: 0, pendingDebt: 0, salesList: [] };
    });

    // Accumulate sales
    sales.forEach(sale => {
      if (sale.status === 'order') return; // Exclude raw catalog orders from stats
      
      const cId = sale.customerId;
      if (!map[cId]) {
        map[cId] = { totalBought: 0, pendingDebt: 0, salesList: [] };
      }
      
      map[cId].totalBought += sale.totalAmount;
      map[cId].salesList.push(sale);
      
      if (sale.status === 'pending' || sale.status === 'partial') {
        map[cId].pendingDebt += sale.outstandingBalance !== undefined ? sale.outstandingBalance : sale.totalAmount;
      }
    });

    return map;
  }, [customers, sales]);

  // Filtered Customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''));
      return matchesSearch;
    });
  }, [customers, searchTerm]);

  // Selected Customer details
  const selectedCustomerDetails = useMemo(() => {
    if (!selectedCustId) return null;
    const cust = customers.find(c => c.id === selectedCustId);
    if (!cust) return null;

    const stats = customerDebtsAndStats[selectedCustId] || { totalBought: 0, pendingDebt: 0, salesList: [] };
    
    // Sort customer sales from newest to oldest
    const sortedSales = [...stats.salesList].sort(
      (a, b) => new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime()
    );

    return {
      customer: cust,
      totalBought: stats.totalBought,
      pendingDebt: stats.pendingDebt,
      salesList: sortedSales
    };
  }, [selectedCustId, customers, customerDebtsAndStats]);

  // Handle open add customer
  const handleOpenAddCustomer = () => {
    setEditingCust(null);
    setCustName('');
    setCustPhone('');
    setIsCustModalOpen(true);
  };

  useEffect(() => {
    if (openCustomerModalOnLoad) {
      handleOpenAddCustomer();
      if (onResetCustomerModalTrigger) {
        onResetCustomerModalTrigger();
      }
    }
  }, [openCustomerModalOnLoad, onResetCustomerModalTrigger]);

  // Handle open edit customer
  const handleOpenEditCustomer = (e: React.MouseEvent, c: Customer) => {
    e.stopPropagation(); // prevent opening details
    setEditingCust(c);
    setCustName(c.name);
    setCustPhone(c.phone);
    setIsCustModalOpen(true);
  };

  // Handle Save Customer Submit
  const handleSaveCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    const customerData: Customer = {
      id: editingCust ? editingCust.id : `cust_${Math.random().toString(36).substring(2, 11)}`,
      name: custName.trim(),
      phone: custPhone.trim(),
      createdAt: editingCust ? editingCust.createdAt : new Date().toISOString()
    };

    await onAddCustomer(customerData);
    setIsCustModalOpen(false);
  };

  // Settle Debt partially or fully distributing from oldest to newest pending installments
  const handleSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustId || !selectedCustomerDetails) return;

    const amountToPay = parseFloat(settleAmount.replace(',', '.'));
    if (isNaN(amountToPay) || amountToPay <= 0) {
      alert('Por favor, digite um valor de pagamento válido.');
      return;
    }

    const currentDebt = selectedCustomerDetails.pendingDebt;
    if (amountToPay > currentDebt + 0.01) {
      alert(`O valor digitado (R$ ${amountToPay}) é maior do que o saldo devedor (R$ ${currentDebt}).`);
      return;
    }

    // Process payment by updating pending sales from oldest to newest
    const pendingSales = [...selectedCustomerDetails.salesList]
      .filter(s => s.status === 'pending' || s.status === 'partial')
      .sort((a, b) => new Date(a.date + 'T12:00:00').getTime() - new Date(b.date + 'T12:00:00').getTime());

    let remainingPayment = amountToPay;

    for (const sale of pendingSales) {
      if (remainingPayment <= 0) break;

      const updatedSale = { ...sale };

      if (updatedSale.installments && updatedSale.installments.length > 0) {
        // Structured fiado: pay off oldest pending installments
        const updatedInsts = updatedSale.installments.map(inst => {
          if (inst.status === 'pending' && remainingPayment >= inst.amount) {
            remainingPayment -= inst.amount;
            return {
              ...inst,
              status: 'paid' as const,
              paidDate: new Date().toISOString()
            };
          }
          return inst;
        });

        const pendingSum = updatedInsts
          .filter(i => i.status === 'pending')
          .reduce((sum, i) => sum + i.amount, 0);

        updatedSale.installments = updatedInsts;
        updatedSale.outstandingBalance = parseFloat(pendingSum.toFixed(2));
        updatedSale.status = pendingSum === 0 ? 'paid' : 'partial';

        await onUpdateSale(updatedSale);
      } else {
        // Legacy credit sale
        const saleOutstanding = sale.outstandingBalance !== undefined ? sale.outstandingBalance : sale.totalAmount;
        if (remainingPayment >= saleOutstanding) {
          remainingPayment -= saleOutstanding;
          updatedSale.outstandingBalance = 0;
          updatedSale.status = 'paid';
        } else {
          updatedSale.outstandingBalance = parseFloat((saleOutstanding - remainingPayment).toFixed(2));
          updatedSale.status = 'partial';
          remainingPayment = 0;
        }

        await onUpdateSale(updatedSale);
      }
    }

    setSettleAmount('');
    alert('Pagamento de fiado registrado com sucesso! O fluxo financeiro foi atualizado.');
  };

  // Directly settle a full sale
  const handleDirectSettleSale = (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmConfig({
      isOpen: true,
      title: 'Quitar Compra',
      message: (
        <span>
          Deseja realmente quitar integralmente a compra <strong>#{sale.id.substring(0, 5)}</strong> no valor de <strong>R$ {sale.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>?
        </span>
      ),
      confirmText: 'Quitar Venda',
      isDanger: false,
      onConfirm: async () => {
        if (sale.paymentMethod === 'fiado' && sale.installments) {
          const paidInsts = sale.installments.map(inst => ({
            ...inst,
            status: 'paid' as const,
            paidDate: new Date().toISOString()
          }));
          await onUpdateSale({
            ...sale,
            status: 'paid',
            installments: paidInsts,
            outstandingBalance: 0
          });
        } else {
          await onUpdateSale({
            ...sale,
            status: 'paid',
            outstandingBalance: 0
          });
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        alert('Venda quitada com sucesso!');
      }
    });
  };

  // Settle single installment inside history list
  const handleSettleSingleInstallment = async (sale: Sale, instId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sale.installments) return;

    const updatedInsts = sale.installments.map(inst => {
      if (inst.id === instId) {
        return {
          ...inst,
          status: 'paid' as const,
          paidDate: new Date().toISOString()
        };
      }
      return inst;
    });

    const pendingSum = updatedInsts
      .filter(i => i.status === 'pending')
      .reduce((sum, i) => sum + i.amount, 0);

    const isAllPaid = pendingSum === 0;

    await onUpdateSale({
      ...sale,
      status: isAllPaid ? 'paid' : 'partial',
      installments: updatedInsts,
      outstandingBalance: parseFloat(pendingSum.toFixed(2))
    });

    alert('Parcela quitada com sucesso!');
  };

  // Helper to format WhatsApp links
  const getWhatsAppLink = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const defaultCountry = cleanPhone.length <= 11 ? '55' : '';
    return `https://wa.me/${defaultCountry}${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  // Reminder message template
  const getReminderText = (sale: Sale, inst: Installment) => {
    return `Olá, ${sale.customerName}! ✨\n\nPassando para lembrar amigavelmente que hoje vence a parcela *${inst.installmentNumber}/${sale.installmentsCount || 1}* da sua compra de semijoias (Identificador: *#${sale.id.replace('order_', '').substring(0, 5).toUpperCase()}*).\n\n💰 *Valor:* R$ ${inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n📅 *Vencimento:* ${new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}\n\nSe você já efetuou o pagamento, por favor desconsidere este lembrete. Agradecemos muito a sua preferência! 🥰`;
  };

  return (
    <div id="customers-tab-container" className="space-y-6 pb-24">
      
      {/* Control panel: search & register */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4.5 h-4.5" />
          <input
            id="customers-search"
            type="text"
            placeholder="Buscar cliente por nome ou celular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-neutral-800"
          />
        </div>
        
        <button
          id="btn-add-customer"
          onClick={handleOpenAddCustomer}
          className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      {/* Customers List Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-150 p-12 text-center max-w-md mx-auto">
          <User className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-serif font-bold text-neutral-800">Nenhum cliente cadastrado</h3>
          <p className="text-neutral-500 text-sm mt-1.5">
            Cadastre seus clientes recorrentes para gerenciar o histórico de compras e as vendas fiado.
          </p>
        </div>
      ) : (
        <div id="customers-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const stats = customerDebtsAndStats[cust.id] || { totalBought: 0, pendingDebt: 0, salesList: [] };
            const hasDebt = stats.pendingDebt > 0;

            const daysSinceLastPurchase = (() => {
              if (!stats.salesList || stats.salesList.length === 0) return null;
              const sorted = [...stats.salesList].sort((a, b) => b.date.localeCompare(a.date));
              const lastDateStr = sorted[0].date;
              const lastDate = new Date(lastDateStr + 'T12:00:00');
              const today = new Date();
              today.setHours(12, 0, 0, 0);
              const diffTime = today.getTime() - lastDate.getTime();
              return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
            })();

            let borderClass = "border-[#E8D5DC] hover:border-[#C4708A]";
            if (hasDebt) {
              const lastPurchaseDays = daysSinceLastPurchase ?? 0;
              if (lastPurchaseDays > 30) {
                borderClass = "border-red-400 ring-1 ring-red-200/50 shadow-[0_0_12px_rgba(239,68,68,0.06)] hover:border-red-500";
              } else {
                borderClass = "border-amber-300 ring-1 ring-amber-100/50 shadow-[0_0_10px_rgba(245,158,11,0.04)] hover:border-amber-400";
              }
            }
            
            const borderLeftClass = hasDebt ? "border-l-4 border-l-red-500" : "border-l-4 border-l-emerald-500";
            
            return (
              <div
                id={`customer-card-${cust.id}`}
                key={cust.id}
                onClick={() => setSelectedCustId(cust.id)}
                className={`bg-white rounded-2xl border ${borderClass} ${borderLeftClass} p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3.5 group relative`}
              >
                {/* Customer primary info */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-neutral-800 group-hover:text-[#C4708A] transition-colors text-base line-clamp-1">
                      {cust.name}
                    </h4>
                    
                    {/* View Details Eye Icon */}
                    <span className="text-neutral-300 group-hover:text-[#C4708A] transition-colors">
                      <Eye className="w-4 h-4" />
                    </span>
                  </div>

                  {cust.phone ? (
                    <p className="text-neutral-500 text-xs flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      {cust.phone}
                    </p>
                  ) : (
                    <p className="text-neutral-400 text-xs italic">Sem telefone cadastrado</p>
                  )}
                </div>

                {/* Stats Inline Block */}
                <div className="grid grid-cols-3 gap-1.5 bg-neutral-50/70 p-2.5 rounded-xl text-center border border-neutral-100/80">
                  <div>
                    <span className="text-[9px] text-neutral-400 block uppercase font-bold tracking-wider">Comprado</span>
                    <span className="text-[10px] font-bold text-neutral-800">
                      {(stats.totalBought || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-400 block uppercase font-bold tracking-wider">Pedidos</span>
                    <span className="text-[10px] font-bold text-neutral-800">
                      {(stats.salesList || []).length} { (stats.salesList || []).length === 1 ? 'pedido' : 'pedidos' }
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-400 block uppercase font-bold tracking-wider">Último</span>
                    <span className="text-[10px] font-bold text-neutral-600 block line-clamp-1">
                      {daysSinceLastPurchase !== null ? `${daysSinceLastPurchase}d atrás` : 'Nunca'}
                    </span>
                  </div>
                </div>

                {/* Debts Status & Actions */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-neutral-400 block uppercase font-bold tracking-wider">Saldo Devedor</span>
                    <span className={`text-sm font-extrabold ${hasDebt ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {hasDebt ? `R$ ${stats.pendingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Em dia'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Edit info */}
                    <button
                      id={`btn-edit-cust-${cust.id}`}
                      onClick={(e) => handleOpenEditCustomer(e, cust)}
                      className="p-1.5 text-neutral-400 hover:text-[#C4708A] hover:bg-[#F9E0E8] rounded-lg transition-colors cursor-pointer"
                      title="Editar dados"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete info */}
                    <button
                      id={`btn-delete-cust-${cust.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmConfig({
                          isOpen: true,
                          title: 'Excluir Cliente',
                          message: (
                            <span>
                              Tem certeza de que deseja excluir o cliente <strong>"{cust.name}"</strong>? As compras vinculadas a ele serão mantidas como "Venda Balcão" no histórico de vendas.
                            </span>
                          ),
                          confirmText: 'Excluir',
                          isDanger: true,
                          onConfirm: async () => {
                            await onDeleteCustomer(cust.id);
                            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                          }
                        });
                      }}
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir cliente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-neutral-100/60">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustId(cust.id);
                    }}
                    className="flex-1 min-w-[65px] py-1 px-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 hover:text-[#C4708A] border border-neutral-200/80 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Ver Histórico Completo"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Histórico</span>
                  </button>

                  {cust.phone && (
                    hasDebt ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const formattedPhone = cust.phone.replace(/\D/g, '');
                          const cleanPhone = formattedPhone.startsWith('55') ? formattedPhone : '55' + formattedPhone;
                          const text = `Olá ${cust.name}, tudo bem? Passando para lembrar que você tem um saldo de R$ ${stats.pendingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em aberto com o Semijoias Pro. Quando puder, me avise! 🌸`;
                          const encodedText = encodeURIComponent(text);
                          window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
                        }}
                        className="flex-1 min-w-[65px] py-1 px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-100 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Cobrar via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Cobrar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const publicLink = `${getPublicOrigin()}/?catalog=true`;
                          const formattedPhone = cust.phone.replace(/\D/g, '');
                          const cleanPhone = formattedPhone.startsWith('55') ? formattedPhone : '55' + formattedPhone;
                          const text = `Olá ${cust.name}! Segue o link do nosso catálogo de semijoias novidades: ${publicLink} 🌸 Espero que goste!`;
                          const encodedText = encodeURIComponent(text);
                          window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
                        }}
                        className="flex-1 min-w-[70px] py-1 px-1.5 bg-pink-50 hover:bg-[#F9E0E8] text-[#C4708A] hover:text-[#8B3A55] border border-pink-100/50 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Enviar Catálogo no WhatsApp"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Catálogo</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CUSTOMER DETAIL BOTTOM SHEET / MODAL */}
      {selectedCustId && selectedCustomerDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setSelectedCustId(null);
                setExpandedSales({});
              }}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 pb-4 mb-4 gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="bg-amber-50 text-amber-600 p-3 rounded-full border border-amber-100 shadow-xs">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xl text-neutral-800">{selectedCustomerDetails.customer.name}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Cliente cadastrado em {new Date(selectedCustomerDetails.customer.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Messaging Actions */}
              {selectedCustomerDetails.customer.phone && (
                <a
                  href={getWhatsAppLink(
                    selectedCustomerDetails.customer.phone,
                    `Olá, ${selectedCustomerDetails.customer.name}! Passando para compartilhar nossas novidades em semijoias e conferir se está tudo certinho. Abraço! ✨`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all w-full sm:w-auto"
                >
                  <MessageSquare className="w-4 h-4 fill-current" />
                  <span>Chamar no WhatsApp</span>
                </a>
              )}
            </div>

            {/* Financial Status Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-150">
                <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider">Total Comprado</span>
                <span className="text-base font-extrabold text-neutral-800">
                  R$ {selectedCustomerDetails.totalBought.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-neutral-400 block mt-0.5">Soma de todas as compras</span>
              </div>

              <div className={`rounded-2xl p-3 border ${
                selectedCustomerDetails.pendingDebt > 0 
                  ? 'bg-amber-50/45 border-amber-200' 
                  : 'bg-emerald-50/45 border-emerald-200'
              }`}>
                <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider">Saldo Devedor (Fiado)</span>
                <span className={`text-base font-extrabold ${selectedCustomerDetails.pendingDebt > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  R$ {selectedCustomerDetails.pendingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-neutral-400 block mt-0.5 font-medium">A pagar / pendente</span>
              </div>
            </div>

            {/* Quick Settle Debt Form (Active ONLY if they have debt) */}
            {selectedCustomerDetails.pendingDebt > 0 && (
              <div className="bg-amber-50/30 border border-amber-100 rounded-2xl p-4 mb-6 space-y-3">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-800">Registrar Recebimento de Fiado</h4>
                    <p className="text-[10px] text-neutral-500">
                      Registre quando o cliente pagar parte ou o total do fiado. O sistema quitará as parcelas pendentes mais antigas.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSettleDebt} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">R$</span>
                    <input
                      id="settle-debt-input"
                      type="text"
                      required
                      placeholder={`Valor pago (máx R$ ${selectedCustomerDetails.pendingDebt.toLocaleString('pt-BR')})`}
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:border-amber-500 outline-none text-neutral-800"
                    />
                  </div>
                  <div className="flex space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSettleAmount(selectedCustomerDetails.pendingDebt.toString().replace('.', ','))}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold px-3 py-2 rounded-xl border border-amber-200 cursor-pointer"
                    >
                      Total Integral
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      Confirmar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Purchase History List */}
            <div>
              <h4 className="font-serif font-bold text-sm text-neutral-800 mb-2.5 flex items-center gap-1.5">
                <History className="w-4 h-4 text-neutral-400" />
                Histórico de Compras ({selectedCustomerDetails.salesList.length})
              </h4>

              {selectedCustomerDetails.salesList.length === 0 ? (
                <div className="border border-dashed border-neutral-200 rounded-2xl p-6 text-center text-xs text-neutral-400">
                  Nenhuma compra registrada para este cliente.
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {selectedCustomerDetails.salesList.map((sale) => {
                    const isExpanded = !!expandedSales[sale.id];
                    const isFiado = sale.paymentMethod === 'fiado';
                    const hasInstallments = sale.installments && sale.installments.length > 0;
                    
                    return (
                      <div
                        id={`cust-detail-sale-${sale.id}`}
                        key={sale.id}
                        className="bg-neutral-50 hover:bg-neutral-100/70 rounded-xl p-3 border border-neutral-150 flex flex-col gap-2 transition-all"
                      >
                        {/* Primary details header row */}
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] font-bold bg-white text-neutral-500 border px-1.5 py-0.5 rounded-sm uppercase">
                                #{sale.id.replace('order_', '').substring(0, 5).toUpperCase()}
                              </span>
                              <span className="text-neutral-500 font-medium flex items-center gap-0.5">
                                <Calendar className="w-3 h-3 text-neutral-400" />
                                {new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </span>
                              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                                isFiado ? 'bg-purple-100 text-purple-700' : 'bg-neutral-100 text-neutral-700'
                              }`}>
                                {isFiado ? 'Fiado' : (sale.paymentMethod === 'pix' ? 'Pix' : (sale.paymentMethod === 'credit_card' ? 'Crédito' : 'Débito'))}
                              </span>
                            </div>
                            <div className="font-semibold text-neutral-600">
                              {sale.items.map(item => `${item.quantity}x ${item.productName}`).join(', ')}
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            <div>
                              <span className="font-extrabold text-neutral-800 block">
                                R$ {sale.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {isFiado && sale.outstandingBalance !== undefined && (
                                <span className="text-[10px] text-red-600 block font-bold">
                                  Restante: R$ {sale.outstandingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                              <span className={`text-[9px] font-bold uppercase ${
                                sale.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                {sale.status === 'paid' ? 'Pago' : 'Pendente'}
                              </span>
                            </div>

                            {/* Accordion Toggle for installments details */}
                            {isFiado && hasInstallments && (
                              <button
                                onClick={(e) => toggleExpandSale(sale.id, e)}
                                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg cursor-pointer hover:bg-white"
                                title="Visualizar carnê de parcelas"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                            
                            {/* Direct single checkoff */}
                            {sale.status !== 'paid' && (
                              <button
                                id={`btn-settle-sale-direct-${sale.id}`}
                                onClick={(e) => handleDirectSettleSale(sale, e)}
                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 p-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                                title="Registrar quitação integral deste pedido"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable installments lists inside details drawer */}
                        {isExpanded && isFiado && hasInstallments && (
                          <div className="mt-2 border-t border-dashed border-neutral-200 pt-2 space-y-1.5">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-400 block mb-1">Carnê de Parcelas</span>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {sale.installments?.map((inst) => {
                                const isInstPaid = inst.status === 'paid';
                                return (
                                  <div 
                                    key={inst.id}
                                    className={`p-2 rounded-lg border flex items-center justify-between text-[11px] font-medium leading-relaxed ${
                                      isInstPaid 
                                        ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                                        : 'bg-white border-neutral-200 text-neutral-700'
                                    }`}
                                  >
                                    <div>
                                      <span className="font-bold block">Parcela {inst.installmentNumber}/{sale.installmentsCount || 1}</span>
                                      <span className="text-[9px] text-neutral-400 block">Vence: {new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                      <span className="font-extrabold text-neutral-800 block">R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    <div className="flex items-center space-x-1 shrink-0">
                                      {/* Remind via whatsapp */}
                                      {!isInstPaid && selectedCustomerDetails.customer.phone && (
                                        <a
                                          href={getWhatsAppLink(selectedCustomerDetails.customer.phone, getReminderText(sale, inst))}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1 text-neutral-400 hover:text-emerald-600 rounded-md hover:bg-neutral-50 cursor-pointer"
                                          title="Enviar lembrete pelo WhatsApp"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" />
                                        </a>
                                      )}

                                      {/* Settle */}
                                      {!isInstPaid ? (
                                        <button
                                          onClick={(e) => handleSettleSingleInstallment(sale, inst.id, e)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black px-2 py-1 rounded-md shadow-xs cursor-pointer flex items-center gap-0.5"
                                        >
                                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Quitar
                                        </button>
                                      ) : (
                                        <span className="text-emerald-600 text-[9px] font-bold bg-emerald-100 px-1.5 py-0.5 rounded-md">Pago</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-neutral-100 mt-6 text-right">
              <button
                onClick={() => {
                  setSelectedCustId(null);
                  setExpandedSales({});
                }}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {isCustModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCustModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif font-bold text-xl text-neutral-800 flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-amber-600" />
              {editingCust ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
            </h3>

            <form onSubmit={handleSaveCustomerSubmit} className="space-y-4">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Nome Completo *</label>
                <input
                  id="modal-cust-name"
                  type="text"
                  required
                  placeholder="Ex: Mariana Costa Oliveira"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-850"
                />
              </div>

              {/* Customer Phone */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Telefone / WhatsApp</label>
                <input
                  id="modal-cust-phone"
                  type="tel"
                  placeholder="Ex: (11) 99888-7766"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-850"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block leading-normal font-medium">
                  Insira DDD e número. Usado para enviar cobranças ou lembretes via WhatsApp.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustModalOpen(false)}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-700 font-semibold text-sm py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-semibold text-sm py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText="Cancelar"
        isDanger={confirmConfig.isDanger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
