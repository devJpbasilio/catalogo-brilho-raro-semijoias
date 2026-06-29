/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Sale, Product, Customer, SaleItem, Installment } from '../types';
import { 
  ShoppingBag, Plus, Search, Calendar, User, DollarSign, 
  Check, X, Trash2, ArrowUpRight, Clock, AlertCircle, ShoppingCart, Minus,
  MessageSquare, ChevronDown, ChevronUp, CheckCircle2, Bell, Sparkles, Filter
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface SalesTabProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  onAddSale: (sale: Sale) => Promise<void>;
  onDeleteSale: (id: string) => Promise<void>;
  onAddCustomerClick?: () => void;
}

export default function SalesTab({
  sales,
  products,
  customers,
  onAddSale,
  onDeleteSale,
  onAddCustomerClick
}: SalesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  // Modal states
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'order'>('all');
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [expandedSales, setExpandedSales] = useState<Record<string, boolean>>({});

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

  // New Sale form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('balcao');
  const [clienteBuscaInput, setClienteBuscaInput] = useState('');
  const [isClienteDropdownOpen, setIsClienteDropdownOpen] = useState(false);
  const clienteSearchRef = useRef<HTMLDivElement>(null);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'debit_card' | 'fiado'>('pix');
  
  // Fiado extra form state
  const [downPayment, setDownPayment] = useState<number>(0);
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [firstDueDate, setFirstDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Shopping Cart state inside the modal
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);

  // Total amount of current cart
  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cartItems]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearchInput, setProductSearchInput] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);
  const [addQty, setAddQty] = useState(1);

  // Close product search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close customer search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clienteSearchRef.current && !clienteSearchRef.current.contains(event.target as Node)) {
        setIsClienteDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper to normalize strings for search
  const normalizarTexto = (texto: string) => {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Map pending debt for each customer
  const customerDebts = useMemo(() => {
    const debtMap: Record<string, number> = {};
    sales.forEach(sale => {
      if (sale.status === 'order') return; // Ignore catalog orders
      const cId = sale.customerId;
      if (sale.status === 'pending' || sale.status === 'partial') {
        const debt = sale.outstandingBalance !== undefined ? sale.outstandingBalance : sale.totalAmount;
        debtMap[cId] = (debtMap[cId] || 0) + debt;
      }
    });
    return debtMap;
  }, [sales]);

  // Filter customers based on autocomplete search
  const filteredCustomers = useMemo(() => {
    const filtroNorm = normalizarTexto(clienteBuscaInput);
    if (!filtroNorm) return customers;
    return customers.filter(c => {
      const nomeNorm = normalizarTexto(c.name || '');
      const foneNorm = normalizarTexto(c.phone || '');
      return nomeNorm.includes(filtroNorm) || foneNorm.includes(filtroNorm);
    });
  }, [customers, clienteBuscaInput]);

  // Outstanding debt for currently selected customer
  const selectedCustomerDebt = useMemo(() => {
    if (selectedCustomerId === 'balcao') return 0;
    return customerDebts[selectedCustomerId] || 0;
  }, [selectedCustomerId, customerDebts]);

  // Approval Modal state (for catalog orders)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approvingOrder, setApprovingOrder] = useState<Sale | null>(null);
  const [approveCustomerId, setApproveCustomerId] = useState('balcao');
  const [approvePaymentMethod, setApprovePaymentMethod] = useState<'pix' | 'credit_card' | 'debit_card' | 'fiado'>('pix');
  const [approveDownPayment, setApproveDownPayment] = useState<number>(0);
  const [approveInstallmentsCount, setApproveInstallmentsCount] = useState<number>(1);
  const [approveFirstDueDate, setApproveFirstDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Reminders Modal / Widget Toggle state
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);

  // Helper to toggle sale row expansion (useful for viewing installment details)
  const toggleExpandSale = (id: string) => {
    setExpandedSales(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to format WhatsApp links
  const getWhatsAppLink = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const defaultCountry = cleanPhone.length <= 11 ? '55' : '';
    return `https://wa.me/${defaultCountry}${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  // Prefilled polite reminder text for a specific installment
  const getReminderText = (sale: Sale, inst: Installment) => {
    return `Olá, ${sale.customerName}! ✨\n\nPassando para lembrar amigavelmente que hoje vence a parcela *${inst.installmentNumber}/${sale.installmentsCount || 1}* da sua compra de semijoias (Identificador: *#${sale.id.replace('order_', '').substring(0, 5).toUpperCase()}*).\n\n💰 *Valor:* R$ ${inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n📅 *Vencimento:* ${new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}\n\nSe você já efetuou o pagamento, por favor desconsidere este lembrete. Agradecemos muito a sua preferência! 🥰`;
  };

  // Math helper for installments distribution
  const calculateInstallmentList = (total: number, entry: number, count: number, dueDate: string) => {
    const financed = Math.max(0, total - entry);
    if (financed <= 0) return [];
    
    const valuePerInstallment = parseFloat((financed / count).toFixed(2));
    const list: Installment[] = [];
    
    for (let i = 1; i <= count; i++) {
      const d = new Date(dueDate + 'T12:00:00');
      if (i > 1) {
        d.setMonth(d.getMonth() + (i - 1));
      }
      
      list.push({
        id: `inst_${Math.random().toString(36).substring(2, 9)}`,
        installmentNumber: i,
        amount: i === count ? parseFloat((financed - valuePerInstallment * (count - 1)).toFixed(2)) : valuePerInstallment,
        dueDate: d.toISOString().split('T')[0],
        status: 'pending'
      });
    }
    return list;
  };

  // Helper to format numeric value as BRL currency representation
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Helper to handle typing on a BRL currency input
  const handleBRLInputChange = (inputValue: string, setter: (val: number) => void) => {
    const cleanValue = inputValue.replace(/\D/g, '');
    if (cleanValue === '') {
      setter(0);
      return;
    }
    const numericValue = parseFloat(cleanValue) / 100;
    setter(numericValue);
  };

  // Automatic live calculated installments preview in registration modal
  const liveInstallments = useMemo(() => {
    if (paymentMethod !== 'fiado') return [];
    return calculateInstallmentList(cartTotal, downPayment, installmentsCount, firstDueDate);
  }, [cartTotal, paymentMethod, downPayment, installmentsCount, firstDueDate]);

  // Automatic live calculated installments preview in approval modal
  const liveApproveInstallments = useMemo(() => {
    if (!approvingOrder || approvePaymentMethod !== 'fiado') return [];
    return calculateInstallmentList(approvingOrder.totalAmount, approveDownPayment, approveInstallmentsCount, approveFirstDueDate);
  }, [approvingOrder, approvePaymentMethod, approveDownPayment, approveInstallmentsCount, approveFirstDueDate]);

  // Daily reminders collector: Unpaid installments due today or overdue
  const activeFiadoReminders = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const list: { sale: Sale; installment: Installment; isOverdue: boolean }[] = [];
    
    sales.forEach(sale => {
      if (sale.status === 'order') return;
      if (sale.paymentMethod === 'fiado' && sale.installments) {
        sale.installments.forEach(inst => {
          if (inst.status === 'pending') {
            const isDueOrOverdue = inst.dueDate <= todayStr;
            if (isDueOrOverdue) {
              list.push({
                sale,
                installment: inst,
                isOverdue: inst.dueDate < todayStr
              });
            }
          }
        });
      }
    });
    
    return list;
  }, [sales]);

  // Calculate stats for sales (excluding catalog orders to protect reports)
  const stats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;

    sales.forEach(s => {
      if (s.status === 'order') return;
      total += s.totalAmount;
      if (s.status === 'paid') {
        paid += s.totalAmount;
      } else {
        pending += s.outstandingBalance !== undefined ? s.outstandingBalance : s.totalAmount;
      }
    });

    return { total, paid, pending };
  }, [sales]);

  // Filtered Sales list
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchesSearch = 
        s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        filterStatus === 'all' 
          ? s.status !== 'order' // "Todas" excludes raw catalog orders
          : (filterStatus === 'order' ? s.status === 'order' : s.status === filterStatus);

      return matchesSearch && matchesStatus;
    });
  }, [sales, searchTerm, filterStatus]);

  // Available products for dropdown
  const availableProducts = useMemo(() => {
    return products.filter(p => p.isAvailable);
  }, [products]);

  // Selected product details for cart adding
  const currentSelectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Handle adding product to cart
  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const existingIndex = cartItems.findIndex(item => item.productId === selectedProductId);
    const existingQty = existingIndex >= 0 ? cartItems[existingIndex].quantity : 0;
    const requestedQty = existingQty + addQty;

    // Validate stock
    if (prod.estoque !== undefined && prod.estoque !== null) {
      if (prod.estoque < requestedQty) {
        alert(`Estoque insuficiente para "${prod.name}"! Estoque disponível: ${prod.estoque}. Você já possui ${existingQty} no carrinho e tentou adicionar mais ${addQty}.`);
        return;
      }
    }
    
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += addQty;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, {
        productId: prod.id,
        productName: prod.name,
        price: (prod.isPromo && prod.promoPrice) ? prod.promoPrice : prod.price,
        quantity: addQty
      }]);
    }

    // Reset selectors
    setSelectedProductId('');
    setProductSearchInput('');
    setIsProductDropdownOpen(false);
    setAddQty(1);
  };

  // Remove from cart
  const handleRemoveFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.productId !== productId));
  };

  // Update quantity of item in cart
  const handleUpdateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    const prod = products.find(p => p.id === productId);
    if (prod && prod.estoque !== undefined && prod.estoque !== null) {
      if (prod.estoque < newQty) {
        alert(`Estoque insuficiente para "${prod.name}"! Estoque disponível: ${prod.estoque}.`);
        return;
      }
    }

    setCartItems(cartItems.map(item => item.productId === productId ? { ...item, quantity: newQty } : item));
  };

  // Handle Register Sale (Manual Cart creation)
  const handleRegisterSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert('Por favor, adicione pelo menos uma semijoia ao carrinho.');
      return;
    }

    let customerName = 'Venda Balcão (Avulso)';
    let customerPhone = '';

    if (selectedCustomerId !== 'balcao') {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        customerName = customer.name;
        customerPhone = customer.phone;
      }
    }

    // Ensure Fiado sale is linked to a registered customer
    if (paymentMethod === 'fiado' && selectedCustomerId === 'balcao') {
      alert('Para vendas no fiado, é obrigatório selecionar um cliente cadastrado.');
      return;
    }

    // Validate stock for all items
    for (const item of cartItems) {
      const prod = products.find(p => p.id === item.productId);
      if (prod && prod.estoque !== undefined && prod.estoque !== null) {
        if (prod.estoque < item.quantity) {
          alert(`Estoque insuficiente para "${prod.name}"! Estoque disponível: ${prod.estoque}. Quantidade no carrinho: ${item.quantity}.`);
          return;
        }
      }
    }

    const saleId = 'SALE_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const isFiado = paymentMethod === 'fiado';
    const finalOutstanding = isFiado ? Math.max(0, cartTotal - downPayment) : 0;

    const newSale: Sale = {
      id: saleId,
      customerId: selectedCustomerId,
      customerName,
      customerPhone,
      items: cartItems,
      totalAmount: cartTotal,
      paymentMethod,
      status: isFiado ? (finalOutstanding === 0 ? 'paid' : 'pending') : 'paid',
      date: saleDate,
      createdAt: new Date().toISOString(),
      ...(isFiado && {
        downPayment,
        installmentsCount,
        installments: calculateInstallmentList(cartTotal, downPayment, installmentsCount, firstDueDate),
        outstandingBalance: finalOutstanding
      })
    };

    await onAddSale(newSale);
    
    // Abrir o recibo de venda
    if (typeof (window as any).abrirRecibo === 'function') {
      (window as any).abrirRecibo({
        id: newSale.id,
        data: newSale.date,
        cliente: newSale.customerName,
        clienteCelular: newSale.customerPhone || '',
        forma: newSale.paymentMethod,
        itens: newSale.items.map(item => ({
          nome: item.productName,
          quantidade: item.quantity,
          preco: item.price
        })),
        total: newSale.totalAmount,
        ...(newSale.paymentMethod === 'fiado' && {
          entrada: newSale.downPayment || 0,
          parcelas: newSale.installmentsCount || 1,
          primeiroVencimento: newSale.installments && newSale.installments.length > 0 ? newSale.installments[0].dueDate : firstDueDate
        })
      });
    }
    
    // Reset state & close
    setIsSaleModalOpen(false);
    setSelectedCustomerId('balcao');
    setClienteBuscaInput('');
    setIsClienteDropdownOpen(false);
    setCartItems([]);
    setPaymentMethod('pix');
    setDownPayment(0);
    setInstallmentsCount(1);
    setSaleDate(new Date().toISOString().split('T')[0]);
  };

  // Match customer name from raw catalog order to registered customers
  const matchedCustomerForApproval = useMemo(() => {
    if (!approvingOrder) return null;
    return customers.find(c => 
      c.name.toLowerCase() === approvingOrder.customerName.toLowerCase() ||
      (c.phone && approvingOrder.customerPhone && c.phone.replace(/\D/g, '') === approvingOrder.customerPhone.replace(/\D/g, ''))
    );
  }, [approvingOrder, customers]);

  // Open Approval Flow Modal
  const handleOpenApproveModal = (saleOrder: Sale) => {
    setApprovingOrder(saleOrder);
    
    // Attempt auto-match customer
    const matched = customers.find(c => 
      c.name.toLowerCase() === saleOrder.customerName.toLowerCase() ||
      (c.phone && saleOrder.customerPhone && c.phone.replace(/\D/g, '') === saleOrder.customerPhone.replace(/\D/g, ''))
    );
    
    setApproveCustomerId(matched ? matched.id : 'balcao');
    setApprovePaymentMethod('pix');
    setApproveDownPayment(0);
    setApproveInstallmentsCount(1);
    
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setApproveFirstDueDate(d.toISOString().split('T')[0]);
    
    setIsApproveModalOpen(true);
  };

  // Submit manual finalization for catalog order
  const handleApproveOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingOrder) return;

    let finalCustId = approveCustomerId;
    let finalCustName = approvingOrder.customerName;
    let finalCustPhone = approvingOrder.customerPhone;

    if (approveCustomerId !== 'balcao') {
      const customer = customers.find(c => c.id === approveCustomerId);
      if (customer) {
        finalCustName = customer.name;
        finalCustPhone = customer.phone;
      }
    }

    // Validate stock for all items of approvingOrder
    for (const item of approvingOrder.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod && prod.estoque !== undefined && prod.estoque !== null) {
        if (prod.estoque < item.quantity) {
          alert(`Estoque insuficiente para aprovar "${prod.name}"! Estoque disponível: ${prod.estoque}. Quantidade no pedido: ${item.quantity}.`);
          return;
        }
      }
    }

    if (approvePaymentMethod === 'fiado' && finalCustId === 'balcao') {
      alert('Para vendas no fiado, é obrigatório selecionar ou cadastrar um cliente.');
      return;
    }

    const isFiado = approvePaymentMethod === 'fiado';
    const finalOutstanding = isFiado ? Math.max(0, approvingOrder.totalAmount - approveDownPayment) : 0;

    const finalizedSale: Sale = {
      ...approvingOrder,
      customerId: finalCustId,
      customerName: finalCustName,
      customerPhone: finalCustPhone,
      paymentMethod: approvePaymentMethod,
      status: isFiado ? (finalOutstanding === 0 ? 'paid' : 'pending') : 'paid',
      createdAt: new Date().toISOString(), // refresh timestamp
      ...(isFiado && {
        downPayment: approveDownPayment,
        installmentsCount: approveInstallmentsCount,
        installments: calculateInstallmentList(approvingOrder.totalAmount, approveDownPayment, approveInstallmentsCount, approveFirstDueDate),
        outstandingBalance: finalOutstanding
      })
    };

    await onAddSale(finalizedSale);
    setIsApproveModalOpen(false);
    setApprovingOrder(null);

    // Abrir o recibo de venda
    if (typeof (window as any).abrirRecibo === 'function') {
      (window as any).abrirRecibo({
        id: finalizedSale.id,
        data: finalizedSale.date,
        cliente: finalizedSale.customerName,
        clienteCelular: finalizedSale.customerPhone || '',
        forma: finalizedSale.paymentMethod,
        itens: finalizedSale.items.map(item => ({
          nome: item.productName,
          quantidade: item.quantity,
          preco: item.price
        })),
        total: finalizedSale.totalAmount,
        ...(finalizedSale.paymentMethod === 'fiado' && {
          entrada: finalizedSale.downPayment || 0,
          parcelas: finalizedSale.installmentsCount || 1,
          primeiroVencimento: finalizedSale.installments && finalizedSale.installments.length > 0 ? finalizedSale.installments[0].dueDate : approveFirstDueDate
        })
      });
    } else {
      alert('Pedido finalizado com sucesso! O fluxo financeiro e as parcelas foram criadas.');
    }
  };

  // Directly settle full remaining debt of standard sale or legacy credit
  const handleMarkAsPaid = async (sale: Sale) => {
    if (sale.paymentMethod === 'fiado' && sale.installments) {
      // Mark all installments of this fiado as paid
      const paidInsts = sale.installments.map(inst => ({
        ...inst,
        status: 'paid' as const,
        paidDate: new Date().toISOString()
      }));
      await onAddSale({
        ...sale,
        status: 'paid',
        installments: paidInsts,
        outstandingBalance: 0
      });
    } else {
      // Legacy or regular sale full settlement
      await onAddSale({
        ...sale,
        status: 'paid',
        ...(sale.outstandingBalance !== undefined && { outstandingBalance: 0 })
      });
    }
  };

  // Quitar individual installment inside a fiado sale
  const handleSettleInstallment = async (sale: Sale, targetInstId: string) => {
    if (!sale.installments) return;
    
    const updatedInsts = sale.installments.map(inst => {
      if (inst.id === targetInstId) {
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

    await onAddSale({
      ...sale,
      status: isAllPaid ? 'paid' : 'partial',
      installments: updatedInsts,
      outstandingBalance: parseFloat(pendingSum.toFixed(2))
    });
  };

  // Filter available products based on search term (code, name, part of name)
  const searchedProducts = useMemo(() => {
    const query = productSearchInput.trim().toLowerCase();
    if (!query) return availableProducts;

    return availableProducts.filter((p) => {
      const code = (p.code || `SJ-${p.id.replace('prod_', '').substring(0, 4)}`).toLowerCase();
      const name = p.name.toLowerCase();
      return code.includes(query) || name.includes(query);
    });
  }, [availableProducts, productSearchInput]);

  return (
    <div id="sales-tab-container" className="space-y-6 pb-24">
      
      {/* Visual Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Sold */}
        <div className="bg-white rounded-2xl border border-amber-50 p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block">Total Vendido (Confirmado)</span>
            <span className="text-xl font-bold text-neutral-800">
              R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl border border-amber-100">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Total Received (Caixa) */}
        <div className="bg-white rounded-2xl border border-amber-50 p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block">Recebido (Caixa)</span>
            <span className="text-xl font-bold text-emerald-600">
              R$ {stats.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Total Pending (A Receber) */}
        <div className="bg-white rounded-2xl border border-amber-50 p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block">A Receber (Fiados)</span>
            <span className="text-xl font-bold text-amber-600">
              R$ {stats.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* High-Impact Daily Reminders Banner Alert */}
      {activeFiadoReminders.length > 0 && (
        <div 
          id="reminder-alert-banner"
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 text-amber-800 p-2 rounded-xl border border-amber-200">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="text-center sm:text-left">
              <h4 className="text-sm font-bold text-amber-900">Cobranças e Lembretes do Dia</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Há <strong>{activeFiadoReminders.length}</strong> parcelas de fiado vencendo hoje ou em atraso. Envie cobranças amigáveis.
              </p>
            </div>
          </div>
          <button
            id="btn-open-reminders"
            onClick={() => setIsRemindersOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            Visualizar e Enviar
          </button>
        </div>
      )}

      {/* Control Panel: Search & Add */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4.5 h-4.5" />
          <input
            id="sales-search"
            type="text"
            placeholder="Buscar vendas por cliente, produto, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800"
          />
        </div>
        
        <button
          id="btn-add-sale"
          onClick={() => {
            setCartItems([]);
            setSelectedProductId('');
            setProductSearchInput('');
            setIsProductDropdownOpen(false);
            setSelectedCustomerId('balcao');
            setClienteBuscaInput('');
            setIsClienteDropdownOpen(false);
            setIsSaleModalOpen(true);
          }}
          className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Registrar Venda (Carrinho)
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div id="sales-filter-status" className="flex border-b border-neutral-150 overflow-x-auto">
        <button
          onClick={() => setFilterStatus('all')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            filterStatus === 'all'
              ? 'border-amber-600 text-amber-700 font-extrabold'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          Todas Vendas ({sales.filter(s => s.status !== 'order').length})
        </button>
        <button
          onClick={() => setFilterStatus('paid')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            filterStatus === 'paid'
              ? 'border-amber-600 text-amber-700 font-extrabold'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          Pagas ({sales.filter(s => s.status === 'paid').length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            filterStatus === 'pending' || filterStatus === 'partial'
              ? 'border-amber-600 text-amber-700 font-extrabold'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          Fiados Pendentes / Parciais ({sales.filter(s => s.status === 'pending' || s.status === 'partial').length})
        </button>
        <button
          onClick={() => setFilterStatus('order')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filterStatus === 'order'
              ? 'border-amber-600 text-amber-700 font-extrabold'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          Pedidos do Catálogo ({sales.filter(s => s.status === 'order').length})
          {sales.filter(s => s.status === 'order').length > 0 && (
            <span className="bg-amber-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
              Novo
            </span>
          )}
        </button>
      </div>

      {/* Sales Grid */}
      {filteredSales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-150 p-12 text-center max-w-md mx-auto">
          <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-serif font-bold text-neutral-800">Nenhum registro encontrado</h3>
          <p className="text-neutral-500 text-sm mt-1.5">
            Os filtros selecionados não contêm transações cadastradas.
          </p>
        </div>
      ) : (
        <div id="sales-list" className="space-y-4">
          {filteredSales.map((sale) => {
            const isFiado = sale.paymentMethod === 'fiado';
            const hasInstallments = sale.installments && sale.installments.length > 0;
            const isExpanded = !!expandedSales[sale.id];
            
            return (
              <div
                id={`sale-card-${sale.id}`}
                key={sale.id}
                className="bg-white rounded-2xl border border-amber-50 shadow-xs hover:shadow-sm transition-all p-4 flex flex-col gap-4"
              >
                {/* Sale Header row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Side primary information */}
                  <div className="flex-1 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] bg-neutral-100 text-neutral-600 px-2.5 py-0.5 rounded-md font-bold uppercase">
                        {sale.status === 'order' ? 'PEDIDO' : 'VENDA'}: #{sale.id.replace('order_', '').substring(0, 6).toUpperCase()}
                      </span>
                      
                      <span className="text-xs text-neutral-500 flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        {new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>

                      {/* Payment Method Badge */}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        sale.status === 'order' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : sale.paymentMethod === 'fiado' 
                            ? 'bg-rose-50 text-rose-700 border border-rose-150' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {sale.status === 'order' 
                          ? 'Pedido via WhatsApp' 
                          : sale.paymentMethod === 'fiado' 
                            ? 'Venda no Fiado' 
                            : sale.paymentMethod === 'pix' 
                              ? 'Pix' 
                              : sale.paymentMethod === 'credit_card' 
                                ? 'Cartão de Crédito' 
                                : sale.paymentMethod === 'debit_card' 
                                  ? 'Cartão de Débito'
                                  : 'À Vista'}
                      </span>

                      {/* Status Badge */}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        sale.status === 'paid' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : sale.status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : sale.status === 'order'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-red-100 text-red-800'
                      }`}>
                        {sale.status === 'paid' 
                          ? 'Quitado' 
                          : sale.status === 'partial' 
                            ? 'Parcialmente Pago' 
                            : sale.status === 'order'
                              ? 'Aguardando Aprovação'
                              : 'Em aberto'}
                      </span>
                    </div>

                    {/* Customer description */}
                    <div className="flex items-center gap-2">
                      <User className="w-4.5 h-4.5 text-neutral-400" />
                      <span className="text-sm font-bold text-neutral-800 font-serif">
                        {sale.customerName}
                      </span>
                      {sale.customerPhone && (
                        <span className="text-xs text-neutral-400 font-medium">({sale.customerPhone})</span>
                      )}
                    </div>
                  </div>

                  {/* Right side status values / action buttons */}
                  <div className="flex flex-row md:flex-col items-center justify-between md:justify-center md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider">Total Geral</span>
                      <span className="text-base font-extrabold text-neutral-900">
                        R$ {sale.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {isFiado && sale.outstandingBalance !== undefined && (
                        <span className="text-[10px] text-red-600 block font-bold">
                          Devedor: R$ {sale.outstandingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Dynamic CTA trigger based on status */}
                      {sale.status === 'order' ? (
                        <button
                          id={`btn-approve-order-${sale.id}`}
                          onClick={() => handleOpenApproveModal(sale)}
                          className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Finalizar Venda</span>
                        </button>
                      ) : sale.status !== 'paid' ? (
                        <button
                          id={`btn-pay-sale-${sale.id}`}
                          onClick={() => {
                            setConfirmConfig({
                              isOpen: true,
                              title: 'Quitar Venda',
                              message: (
                                <span>
                                  Deseja realmente quitar o saldo restante de <strong>R$ {(sale.outstandingBalance || sale.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> do cliente <strong>{sale.customerName}</strong>?
                                </span>
                              ),
                              confirmText: 'Quitar Tudo',
                              isDanger: false,
                              onConfirm: async () => {
                                await handleMarkAsPaid(sale);
                                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                              }
                            });
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          title="Receber quitação integral do fiado"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Quitar Tudo</span>
                        </button>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                          Quitado
                        </span>
                      )}

                      {/* Toggle details accordion (For items and installments) */}
                      <button
                        onClick={() => toggleExpandSale(sale.id)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-xl cursor-pointer"
                        title="Ver detalhes"
                      >
                        {isExpanded ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
                      </button>

                      {/* Cancel / Delete Sale Button */}
                      <button
                        id={`btn-del-sale-${sale.id}`}
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Excluir Venda',
                            message: (
                              <span>
                                Tem certeza de que deseja excluir permanentemente o registro de venda <strong>#{sale.id.substring(0, 5)}</strong>? Isso removerá as transações de caixa associadas e esta ação não poderá ser desfeita.
                              </span>
                            ),
                            confirmText: 'Excluir',
                            isDanger: true,
                            onConfirm: async () => {
                              await onDeleteSale(sale.id);
                              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        }}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Excluir Venda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details section */}
                {isExpanded && (
                  <div className="pt-3 border-t border-neutral-100 space-y-4 animate-fadeIn">
                    {/* Items List */}
                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Itens Adquiridos</span>
                      {sale.items.map((item, idx) => {
                        const prod = products.find(p => p.id === item.productId);
                        const imgUrl = prod?.imageUrl || 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=50&q=80';
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs text-neutral-700 font-medium gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={imgUrl}
                                alt={item.productName}
                                className="w-6 h-6 rounded object-cover border border-neutral-200 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <span className="truncate max-w-[200px] sm:max-w-md">{item.productName}</span>
                            </div>
                            <span className="shrink-0 text-neutral-500 text-[11px] font-mono">
                              {item.quantity}x de R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Fiado Installments Tracking view */}
                    {isFiado && hasInstallments && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Carnê de Parcelas (Controle de Fiado)</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {sale.installments?.map((inst) => {
                            const isPaid = inst.status === 'paid';
                            
                            return (
                              <div 
                                key={inst.id}
                                className={`rounded-xl p-2.5 border text-xs flex items-center justify-between gap-2 ${
                                  isPaid 
                                    ? 'bg-emerald-50/45 border-emerald-100 text-emerald-800' 
                                    : 'bg-white border-neutral-200 text-neutral-700'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <span className="font-bold block">
                                    Parcela {inst.installmentNumber}/{sale.installmentsCount || 1}
                                  </span>
                                  <span className="text-[10px] text-neutral-500 block">
                                    Vencimento: {new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                  <span className="text-xs font-bold text-neutral-800 block">
                                    R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-1.5">
                                  {/* Remind button */}
                                  {!isPaid && sale.customerPhone && (
                                    <a
                                      href={getWhatsAppLink(sale.customerPhone, getReminderText(sale, inst))}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                      title="Enviar cobrança via WhatsApp"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </a>
                                  )}

                                  {/* Settle Single installment button */}
                                  {!isPaid ? (
                                    <button
                                      onClick={() => handleSettleInstallment(sale, inst.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                                      title="Dar baixa nesta parcela"
                                    >
                                      <Check className="w-3 h-3 stroke-[2.5]" />
                                      <span>Quitar</span>
                                    </button>
                                  ) : (
                                    <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-100/50 px-2 py-1 rounded-md">
                                      <CheckCircle2 className="w-3 h-3" /> Pago
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* REGISTER SALE CART MODAL */}
      {isSaleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsSaleModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif font-bold text-xl text-neutral-800 flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              Novo Carrinho de Venda
            </h3>

            <form onSubmit={handleRegisterSaleSubmit} className="space-y-4">
              
              {/* Customer Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Cliente *</label>
                <div className="cliente-autocomplete" id="clienteAutocomplete" ref={clienteSearchRef}>
                  <div className="cliente-input-wrap">
                    <span className="cliente-search-icon">🔍</span>
                    <input
                      type="text"
                      id="clienteBuscaInput"
                      className="cliente-busca-input"
                      placeholder="Buscar cliente por nome ou celular..."
                      autoComplete="off"
                      value={clienteBuscaInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClienteBuscaInput(val);
                        setIsClienteDropdownOpen(true);
                        setSelectedCustomerId('balcao'); // reset selection on type
                      }}
                      onFocus={() => setIsClienteDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsClienteDropdownOpen(false);
                          e.currentTarget.blur();
                        }
                      }}
                    />
                    {clienteBuscaInput && (
                      <button
                        type="button"
                        className="cliente-clear-btn"
                        id="clienteClearBtn"
                        title="Limpar"
                        onClick={() => {
                          setClienteBuscaInput('');
                          setSelectedCustomerId('balcao');
                          setIsClienteDropdownOpen(false);
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  {isClienteDropdownOpen && (
                    <ul className="cliente-dropdown" id="clienteDropdown">
                      {/* Opção "Venda Balcão" sempre no topo (só exibe se não há filtro ou se o filtro não é de cliente) */}
                      {(!normalizarTexto(clienteBuscaInput) || 'venda balcao avulso'.includes(normalizarTexto(clienteBuscaInput))) && (
                        <li
                          className="avulso"
                          onClick={() => {
                            setSelectedCustomerId('balcao');
                            setClienteBuscaInput('Venda Balcão (Avulso)');
                            setIsClienteDropdownOpen(false);
                          }}
                        >
                          <span className="cli-nome">🛍️ Venda Balcão (Avulso / Sem cadastro)</span>
                        </li>
                      )}

                      {filteredCustomers.length === 0 && normalizarTexto(clienteBuscaInput) ? (
                        <li className="sem-resultado">
                          Nenhuma cliente encontrada.{' '}
                          <a
                            id="linkCadastrarCliente"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsSaleModalOpen(false);
                              if (onAddCustomerClick) {
                                onAddCustomerClick();
                              }
                            }}
                          >
                            Deseja cadastrar?
                          </a>
                        </li>
                      ) : (
                        filteredCustomers.map((cliente) => {
                          const saldo = customerDebts[cliente.id] || 0;
                          return (
                            <li
                              key={cliente.id}
                              onClick={() => {
                                setSelectedCustomerId(cliente.id);
                                setClienteBuscaInput(cliente.name);
                                setIsClienteDropdownOpen(false);
                              }}
                            >
                              <span className="cli-nome">{cliente.name}</span>
                              <span className="cli-fone">{cliente.phone || ''}</span>
                              {saldo > 0 && (
                                <span className="cli-divida">
                                  Deve R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </li>
                          );
                        })
                      )}
                    </ul>
                  )}

                  {selectedCustomerId !== 'balcao' && selectedCustomerDebt > 0 && (
                    <div className="cliente-aviso-fiado" id="clienteAvisoFiado">
                      ⚠️ Esta cliente possui saldo devedor de R$ {selectedCustomerDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. A venda será registrada normalmente.
                    </div>
                  )}
                </div>
              </div>

              {/* Add Semijoias block */}
              <div className="p-3 bg-amber-50/30 rounded-2xl border border-amber-100/50 space-y-3">
                <span className="text-[11px] font-bold text-amber-800 uppercase block">Adicionar Itens ao Carrinho</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 relative" ref={productSearchRef}>
                    <label className="block text-[10px] text-neutral-500 mb-0.5 font-semibold">Semijoia Disponível</label>
                    <div className="relative">
                      <input
                        id="cart-product-search-input"
                        type="text"
                        placeholder="Buscar por código, nome ou parte do nome..."
                        value={productSearchInput}
                        onChange={(e) => {
                          setProductSearchInput(e.target.value);
                          setIsProductDropdownOpen(true);
                          setSelectedProductId(''); // force selecting from the dropdown
                        }}
                        onFocus={() => setIsProductDropdownOpen(true)}
                        className="w-full bg-white border border-neutral-200 rounded-xl pl-3 pr-8 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-850"
                      />
                      {productSearchInput ? (
                        <button
                          type="button"
                          onClick={() => {
                            setProductSearchInput('');
                            setSelectedProductId('');
                            setIsProductDropdownOpen(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span 
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer"
                          onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    {/* Autocomplete Dropdown List */}
                    {isProductDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-neutral-100">
                        {searchedProducts.length === 0 ? (
                          <div className="p-3 text-center text-xs text-neutral-400 italic">
                            Nenhuma semijoia encontrada
                          </div>
                        ) : (
                          searchedProducts.map((p) => {
                            const pCode = p.code || `SJ-${p.id.replace('prod_', '').substring(0, 4).toUpperCase()}`;
                            const isSelected = selectedProductId === p.id;
                            const hasPromo = p.isPromo && p.promoPrice;
                            
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProductId(p.id);
                                  setProductSearchInput(`${p.name} (${pCode})`);
                                  setIsProductDropdownOpen(false);
                                }}
                                className={`w-full text-left p-2.5 flex items-start justify-between gap-3 text-xs hover:bg-amber-50/50 transition-colors cursor-pointer ${
                                  isSelected ? 'bg-amber-50 font-semibold text-amber-900' : 'text-neutral-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <img
                                    src={p.imageUrl || 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=50&q=80'}
                                    alt={p.name}
                                    className="w-9 h-9 rounded-md object-cover border border-neutral-150 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <span className="inline-block font-mono text-[8px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.2 rounded border border-amber-200 uppercase leading-none">
                                      {pCode}
                                    </span>
                                    <span className="block font-medium truncate text-neutral-800">{p.name}</span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  {hasPromo && p.promoPrice ? (
                                    <>
                                      <span className="text-[10px] text-neutral-400 line-through block leading-none mb-0.5">
                                        R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-amber-700 font-bold block leading-none">
                                        R$ {p.promoPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-bold text-neutral-800 block">
                                      R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5 font-semibold">Quantidade</label>
                    <div className="flex items-center space-x-2">
                      <input
                        id="cart-product-qty"
                        type="number"
                        min={1}
                        value={addQty}
                        onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-center focus:border-amber-500 outline-none text-neutral-800"
                      />
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={!selectedProductId}
                        className={`font-semibold text-xs py-1.5 px-3 rounded-lg text-white shadow-xs ${
                          selectedProductId 
                            ? 'bg-amber-600 hover:bg-amber-700 cursor-pointer' 
                            : 'bg-neutral-200 cursor-not-allowed text-neutral-400'
                        }`}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Show short helper info about selected product */}
                {currentSelectedProduct && (
                  <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-1.5 border-t border-amber-100/40">
                    <span className="font-bold">Total do item:</span>
                    <span>
                      R$ {(currentSelectedProduct.price * addQty).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Cart List Items */}
              <div>
                <span className="block text-xs font-semibold text-neutral-600 mb-1.5">Itens do Carrinho ({cartItems.length})</span>
                
                {cartItems.length === 0 ? (
                  <div className="border border-dashed border-neutral-200 rounded-2xl p-6 text-center text-xs text-neutral-400 bg-neutral-50/50">
                    Carrinho vazio. Adicione semijoias acima.
                  </div>
                ) : (
                  <div className="border border-neutral-150 rounded-2xl overflow-hidden divide-y divide-neutral-100 bg-white max-h-40 overflow-y-auto">
                    {cartItems.map((item) => {
                      const prod = products.find(p => p.id === item.productId);
                      const imgUrl = prod?.imageUrl || 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=50&q=80';
                      
                      return (
                        <div key={item.productId} className="p-2 flex items-center justify-between text-xs gap-3">
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <img
                              src={imgUrl}
                              alt={item.productName}
                              className="w-9 h-9 rounded-md object-cover border border-neutral-150 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-neutral-800 block truncate">{item.productName}</span>
                              <span className="text-[10px] text-neutral-500 block">
                                Unitário: R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          
                          {/* Adjust quantities inside the list */}
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.productId, item.quantity - 1)}
                              className="p-1 rounded-md hover:bg-neutral-100 border border-neutral-200 cursor-pointer"
                            >
                              <Minus className="w-3 h-3 text-neutral-600" />
                            </button>
                            <span className="font-bold text-neutral-700 text-xs w-4 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.productId, item.quantity + 1)}
                              className="p-1 rounded-md hover:bg-neutral-100 border border-neutral-200 cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-neutral-600" />
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.productId)}
                              className="p-1 text-neutral-400 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer"
                              title="Remover"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Data da Venda</label>
                  <input
                    id="cart-date"
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:border-amber-500 outline-none text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Forma de Pagamento</label>
                  <select
                    id="cart-payment"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:border-amber-500 outline-none text-neutral-800"
                  >
                    <option value="pix">Pix (Pago)</option>
                    <option value="cash">Dinheiro (Pago)</option>
                    <option value="credit_card">Cartão de Crédito (Pago)</option>
                    <option value="debit_card">Cartão de Débito (Pago)</option>
                    <option value="fiado">Fiado (Saldo Devedor)</option>
                  </select>
                </div>
              </div>

              {/* Advanced Fiado Section */}
              {paymentMethod === 'fiado' && (
                <div className="p-3 bg-rose-50/40 rounded-2xl border border-rose-100/60 space-y-3 animate-fadeIn">
                  <span className="text-[11px] font-bold text-rose-800 uppercase block">Configurações do Fiado</span>
                  
                  {/* Real-time finance summary for credit */}
                  <div className="grid grid-cols-2 gap-4 text-[10px] bg-white/60 p-2.5 rounded-xl border border-rose-100">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 font-medium">Entrada:</span>
                      <span className="font-bold text-neutral-800">{formatBRL(downPayment)}</span>
                    </div>
                    <div className="flex justify-between items-center border-l border-neutral-200 pl-4">
                      <span className="text-neutral-500 font-medium">Saldo Restante:</span>
                      <span className="font-extrabold text-rose-700">{formatBRL(Math.max(0, cartTotal - downPayment))}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5 font-semibold">Valor Entrada (R$)</label>
                      <input
                        id="fiado-downpayment"
                        type="text"
                        value={formatBRL(downPayment)}
                        onChange={(e) => handleBRLInputChange(e.target.value, setDownPayment)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-850 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5 font-semibold">Qtd Parcelas (Máx 5x)</label>
                      <select
                        id="fiado-installments"
                        value={installmentsCount}
                        onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-800"
                      >
                        <option value={1}>1x (Sem parcelas)</option>
                        <option value={2}>2x</option>
                        <option value={3}>3x</option>
                        <option value={4}>4x</option>
                        <option value={5}>5x</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5 font-semibold">Vencimento 1ª Parcela</label>
                      <input
                        id="fiado-duedate"
                        type="date"
                        required
                        value={firstDueDate}
                        onChange={(e) => setFirstDueDate(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-800"
                      />
                    </div>
                  </div>

                  {/* Installments automatic distribution review preview */}
                  {liveInstallments.length > 0 && (
                    <div className="bg-white/80 rounded-xl p-2.5 border border-rose-100 text-[10px] space-y-1.5 font-semibold text-neutral-700">
                      <span className="text-[9px] uppercase tracking-wider text-rose-800 block">Demonstrativo das Parcelas</span>
                      <div className="divide-y divide-neutral-100">
                        {liveInstallments.map((inst, idx) => (
                          <div key={idx} className="flex justify-between py-1">
                            <span>Parcela {inst.installmentNumber}/{installmentsCount}</span>
                            <span>Vence {new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            <span className="text-rose-700">R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Warning for Fiado without registered customer in general cart */}
              {paymentMethod === 'fiado' && selectedCustomerId === 'balcao' && (
                <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-200 text-[11px] leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Atenção:</strong> Vendas no fiado exigem um cliente cadastrado. Selecione um cliente diferente de "Venda Balcão" para prosseguir.
                  </span>
                </div>
              )}

              {/* Cart Summary */}
              <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-150 flex items-center justify-between text-sm">
                <span className="font-bold text-neutral-600">Total do Carrinho:</span>
                <span className="text-lg font-extrabold text-neutral-900">
                  R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Submit Action */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaleModalOpen(false)}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-700 font-semibold text-sm py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cartItems.length === 0 || (paymentMethod === 'fiado' && selectedCustomerId === 'balcao')}
                  className={`flex-1 font-semibold text-sm py-2.5 rounded-xl shadow-xs transition-all cursor-pointer text-white ${
                    cartItems.length === 0 || (paymentMethod === 'fiado' && selectedCustomerId === 'balcao')
                      ? 'bg-neutral-200 cursor-not-allowed text-neutral-400'
                      : 'bg-amber-600 hover:bg-amber-700 active:scale-98'
                  }`}
                >
                  Finalizar Venda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVE & FINALIZE CATALOG ORDER MODAL */}
      {isApproveModalOpen && approvingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsApproveModalOpen(false);
                setApprovingOrder(null);
              }}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif font-bold text-xl text-neutral-800 flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-purple-600 animate-pulse" />
              Aprovar & Finalizar Venda
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Converta o pedido <strong>#{approvingOrder.id.replace('order_', '').toUpperCase()}</strong> recebido via WhatsApp em uma venda confirmada.
            </p>

            {/* Order Details Briefing */}
            <div className="bg-neutral-50 border border-neutral-150 rounded-2xl p-3.5 mb-4 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-neutral-800">
                <span>Cliente Informado: {approvingOrder.customerName}</span>
                <span>Contato: {approvingOrder.customerPhone || 'Não informado'}</span>
              </div>
              <div className="border-t border-dashed border-neutral-200 pt-2 font-medium text-neutral-600 space-y-1">
                {approvingOrder.items.map((item, idx) => {
                  const prod = products.find(p => p.id === item.productId);
                  const imgUrl = prod?.imageUrl || 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=50&q=80';
                  return (
                    <div key={idx} className="flex justify-between items-center py-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={imgUrl}
                          alt={item.productName}
                          className="w-6 h-6 rounded object-cover border border-neutral-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <span className="truncate">{item.quantity}x {item.productName}</span>
                      </div>
                      <span className="font-mono text-[11px]">R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-neutral-200 pt-2 flex justify-between font-extrabold text-sm text-neutral-800">
                <span>Total Estimado:</span>
                <span>R$ {approvingOrder.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <form onSubmit={handleApproveOrderSubmit} className="space-y-4">
              {/* Linked Customer Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Vincular a um Cliente Cadastrado *
                </label>
                <select
                  id="approve-customer"
                  value={approveCustomerId}
                  onChange={(e) => setApproveCustomerId(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800"
                >
                  <option value="balcao">Sem vincular (Venda Balcão / Avulso)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? ` - ${c.phone}` : ''}
                    </option>
                  ))}
                </select>

                {/* Auto-match recommendation banner if matched customer is found */}
                {matchedCustomerForApproval ? (
                  <div className="bg-purple-50 text-purple-950 p-2.5 rounded-xl border border-purple-200 mt-1.5 text-[10px] leading-relaxed flex items-center justify-between">
                    <span>
                      🌟 <strong>Match Automático:</strong> Encontramos <strong>{matchedCustomerForApproval.name}</strong> em sua base de dados!
                    </span>
                    <button
                      type="button"
                      onClick={() => setApproveCustomerId(matchedCustomerForApproval.id)}
                      className="bg-purple-600 text-white font-extrabold px-2.5 py-1 rounded-lg hover:bg-purple-700 active:scale-95 transition-all text-[9px] cursor-pointer shrink-0 ml-1.5"
                    >
                      Selecionar
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-neutral-400 mt-1 block leading-normal">
                    Se o cliente não estiver cadastrado, você pode mantê-lo como Balcão ou cadastrá-lo antes na aba Clientes.
                  </span>
                )}
              </div>

              {/* Payment details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Forma de Pagamento</label>
                  <select
                    id="approve-payment-method"
                    value={approvePaymentMethod}
                    onChange={(e) => setApprovePaymentMethod(e.target.value as any)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:border-amber-500 outline-none text-neutral-800"
                  >
                    <option value="pix">Pix (Pago)</option>
                    <option value="cash">Dinheiro (Pago)</option>
                    <option value="credit_card">Cartão de Crédito (Pago)</option>
                    <option value="debit_card">Cartão de Débito (Pago)</option>
                    <option value="fiado">Fiado (Saldo Devedor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Data de Aprovação</label>
                  <input
                    type="date"
                    required
                    value={approvingOrder.date}
                    disabled
                    className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2 text-sm text-neutral-500 outline-none"
                  />
                </div>
              </div>

              {/* Advanced Fiado section in Approval */}
              {approvePaymentMethod === 'fiado' && (
                <div className="p-3 bg-rose-50/40 rounded-2xl border border-rose-100/60 space-y-3 animate-fadeIn">
                  <span className="text-[11px] font-bold text-rose-800 uppercase block">Configurações do Fiado</span>
                  
                  {/* Real-time finance summary for credit */}
                  <div className="grid grid-cols-2 gap-4 text-[10px] bg-white/60 p-2.5 rounded-xl border border-rose-100">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 font-medium">Entrada:</span>
                      <span className="font-bold text-neutral-800">{formatBRL(approveDownPayment)}</span>
                    </div>
                    <div className="flex justify-between items-center border-l border-neutral-200 pl-4">
                      <span className="text-neutral-500 font-medium">Saldo Restante:</span>
                      <span className="font-extrabold text-rose-700">{formatBRL(Math.max(0, approvingOrder.totalAmount - approveDownPayment))}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5 font-semibold">Valor Entrada (R$)</label>
                      <input
                        id="approve-downpayment"
                        type="text"
                        value={formatBRL(approveDownPayment)}
                        onChange={(e) => handleBRLInputChange(e.target.value, setApproveDownPayment)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-850 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5 font-semibold">Qtd Parcelas (Máx 5x)</label>
                      <select
                        id="approve-installments"
                        value={approveInstallmentsCount}
                        onChange={(e) => setApproveInstallmentsCount(parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-800"
                      >
                        <option value={1}>1x (Sem parcelas)</option>
                        <option value={2}>2x</option>
                        <option value={3}>3x</option>
                        <option value={4}>4x</option>
                        <option value={5}>5x</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5 font-semibold">Vencimento 1ª Parcela</label>
                      <input
                        id="approve-duedate"
                        type="date"
                        required
                        value={approveFirstDueDate}
                        onChange={(e) => setApproveFirstDueDate(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-800"
                      />
                    </div>
                  </div>

                  {/* Installments automatic distribution review preview */}
                  {liveApproveInstallments.length > 0 && (
                    <div className="bg-white/80 rounded-xl p-2.5 border border-rose-100 text-[10px] space-y-1.5 font-semibold text-neutral-700">
                      <span className="text-[9px] uppercase tracking-wider text-rose-800 block">Demonstrativo das Parcelas</span>
                      <div className="divide-y divide-neutral-100">
                        {liveApproveInstallments.map((inst, idx) => (
                          <div key={idx} className="flex justify-between py-1">
                            <span>Parcela {inst.installmentNumber}/{approveInstallmentsCount}</span>
                            <span>Vence {new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            <span className="text-rose-700">R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Warning for Fiado in Approval */}
              {approvePaymentMethod === 'fiado' && approveCustomerId === 'balcao' && (
                <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-200 text-[11px] leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Atenção:</strong> Vendas no fiado exigem vincular a um cliente cadastrado para registrar o saldo devedor histórico.
                  </span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsApproveModalOpen(false);
                    setApprovingOrder(null);
                  }}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-700 font-semibold text-sm py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={approvePaymentMethod === 'fiado' && approveCustomerId === 'balcao'}
                  className={`flex-1 font-semibold text-sm py-2.5 rounded-xl shadow-xs transition-all cursor-pointer text-white ${
                    approvePaymentMethod === 'fiado' && approveCustomerId === 'balcao'
                      ? 'bg-neutral-200 cursor-not-allowed text-neutral-400'
                      : 'bg-amber-600 hover:bg-amber-700 active:scale-98'
                  }`}
                >
                  Confirmar Venda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TODAY'S BILLINGS / REMINDERS MANAGEMENT MODAL */}
      {isRemindersOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsRemindersOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif font-bold text-xl text-neutral-800 flex items-center gap-2 mb-1.5">
              <Bell className="w-5 h-5 text-amber-600 animate-swing" />
              Lembretes de Parcelas Pendentes
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Envie lembretes amigáveis de pagamento via WhatsApp ou registre baixas das parcelas vencendo hoje ou em atraso.
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {activeFiadoReminders.map(({ sale, installment, isOverdue }) => (
                <div 
                  key={installment.id}
                  className={`rounded-2xl p-3.5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-all ${
                    isOverdue 
                      ? 'bg-red-50/40 border-red-200 text-red-950' 
                      : 'bg-amber-50/30 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isOverdue ? 'Atrasada' : 'Vence Hoje'}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">ID #{sale.id.replace('order_', '').substring(0, 5).toUpperCase()}</span>
                    </div>

                    <h4 className="font-bold text-neutral-800 font-serif text-sm">{sale.customerName}</h4>
                    
                    <p className="text-neutral-600 font-medium leading-normal">
                      Parcela <strong>{installment.installmentNumber}/{sale.installmentsCount || 1}</strong> &bull; Vence {new Date(installment.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                    
                    <span className="text-sm font-extrabold text-neutral-950 block">
                      R$ {installment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    {/* Send WhatsApp message */}
                    {sale.customerPhone ? (
                      <a
                        href={getWhatsAppLink(sale.customerPhone, getReminderText(sale, installment))}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Notificar</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-neutral-400 italic">Sem WhatsApp</span>
                    )}

                    {/* Settle direct installment */}
                    <button
                      onClick={() => {
                        handleSettleInstallment(sale, installment.id);
                        alert(`Parcela de R$ ${installment.amount.toLocaleString('pt-BR')} do cliente ${sale.customerName} quitada!`);
                      }}
                      className="bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 font-bold text-xs px-3 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <span>Dar Baixa</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-neutral-150 mt-6 text-right">
              <button
                onClick={() => setIsRemindersOpen(false)}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Fechar Lembretes
              </button>
            </div>
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
