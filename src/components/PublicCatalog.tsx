/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Product, BrandConfig } from '../types';
import { 
  Search, ShoppingBag, Plus, Minus, Trash2, X, Check, ArrowLeft, 
  HelpCircle, Send, Share2, Sparkles, Heart, Tag, Info, Star, 
  ChevronLeft, ChevronRight, Eye
} from 'lucide-react';

interface PublicCatalogProps {
  products: Product[];
  brandConfig: BrandConfig;
  onAddSale?: (sale: any) => Promise<void>;
}

interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
}

export default function PublicCatalog({ products, brandConfig, onAddSale }: PublicCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedBadge, setSelectedBadge] = useState<'all' | 'new' | 'featured' | 'promo'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Product Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');

  // Customer info for order checkout
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');

  // Load cart and favorites from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(`cart_${brandConfig.brandName}`);
      if (savedCart) setCart(JSON.parse(savedCart));
      
      const savedFavs = localStorage.getItem(`favs_${brandConfig.brandName}`);
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
    } catch (e) {
      console.warn('Failed to load local storage data', e);
    }
  }, [brandConfig.brandName]);

  // Save cart to localStorage
  const saveCartToStorage = (newCart: CartItem[]) => {
    try {
      localStorage.setItem(`cart_${brandConfig.brandName}`, JSON.stringify(newCart));
    } catch (e) {
      console.warn('Failed to save cart to local storage', e);
    }
  };

  // Toggle favorite product
  const toggleFavorite = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId];
      try {
        localStorage.setItem(`favs_${brandConfig.brandName}`, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save favorites to local storage', err);
      }
      return updated;
    });
  };

  // Active products only
  const availableProducts = useMemo(() => {
    return products.filter(p => p.isAvailable);
  }, [products]);

  // Categories list
  const categories = useMemo(() => {
    const list = ['Todos'];
    if (brandConfig.categories) {
      brandConfig.categories.forEach(c => {
        if (!list.includes(c)) list.push(c);
      });
    }
    return list;
  }, [brandConfig]);

  // Filter products by category, search term, and badges
  const filteredProducts = useMemo(() => {
    return availableProducts.filter(p => {
      const matchCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.material && p.material.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchBadge = true;
      if (selectedBadge === 'new') matchBadge = !!p.isNew;
      else if (selectedBadge === 'featured') matchBadge = !!p.isFeatured;
      else if (selectedBadge === 'promo') matchBadge = !!p.isPromo;

      return matchCategory && matchSearch && matchBadge;
    });
  }, [availableProducts, selectedCategory, searchTerm, selectedBadge]);

  // Highlighted section datasets
  const newArrivals = useMemo(() => availableProducts.filter(p => p.isNew), [availableProducts]);
  const featuredProducts = useMemo(() => availableProducts.filter(p => p.isFeatured), [availableProducts]);
  const promotionProducts = useMemo(() => availableProducts.filter(p => p.isPromo), [availableProducts]);

  // Cart functions with size and stock validations
  const addToCart = (product: Product, e?: React.MouseEvent, sizeToSet?: string) => {
    if (e) e.stopPropagation();

    // Check stock availability
    if (product.estoque !== undefined && product.estoque !== null && product.estoque <= 0) {
      alert('Desculpe, este produto está sem estoque no momento.');
      return;
    }

    const finalSize = sizeToSet || selectedSize;

    setCart(prev => {
      // Find item with same ID and same selected size
      const existingIndex = prev.findIndex(item => item.product.id === product.id && item.selectedSize === finalSize);
      let updated: CartItem[];
      
      if (existingIndex > -1) {
        const existingQty = prev[existingIndex].quantity;
        if (product.estoque !== undefined && product.estoque !== null && existingQty >= product.estoque) {
          alert(`Desculpe, limite de estoque atingido (${product.estoque} unidades).`);
          return prev;
        }
        updated = prev.map((item, idx) => 
          idx === existingIndex
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        updated = [...prev, { product, quantity: 1, selectedSize: finalSize || undefined }];
      }
      saveCartToStorage(updated);
      return updated;
    });
  };

  const updateQuantity = (productId: string, delta: number, e?: React.MouseEvent, sizeToMatch?: string) => {
    if (e) e.stopPropagation();
    const prod = products.find(p => p.id === productId);

    setCart(prev => {
      const updated = prev.map(item => {
        if (item.product.id === productId && item.selectedSize === sizeToMatch) {
          const newQty = item.quantity + delta;
          if (delta > 0 && prod && prod.estoque !== undefined && prod.estoque !== null && newQty > prod.estoque) {
            alert(`Desculpe, limite de estoque atingido (${prod.estoque} unidades).`);
            return item;
          }
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
      saveCartToStorage(updated);
      return updated;
    });
  };

  const removeFromCart = (productId: string, e?: React.MouseEvent, sizeToMatch?: string) => {
    if (e) e.stopPropagation();
    setCart(prev => {
      const updated = prev.filter(item => !(item.product.id === productId && item.selectedSize === sizeToMatch));
      saveCartToStorage(updated);
      return updated;
    });
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const itemPrice = (item.product.isPromo && item.product.promoPrice) 
        ? item.product.promoPrice 
        : item.product.price;
      return total + (itemPrice * item.quantity);
    }, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  // Open product detail modal
  const handleOpenDetails = (product: Product) => {
    setSelectedProduct(product);
    setActiveImageIndex(0);
    // Automatically pre-select first size option if available
    if (product.size) {
      const sizes = product.size.split(',').map(s => s.trim()).filter(Boolean);
      if (sizes.length > 0) {
        setSelectedSize(sizes[0]);
      } else {
        setSelectedSize('');
      }
    } else {
      setSelectedSize('');
    }
  };

  // Generate share message and link
  const getShareLink = (product: Product) => {
    const origin = window.location.origin + window.location.pathname;
    const shareText = `Olha que peça linda eu vi no catálogo da *${brandConfig.brandName}*! ✨\n\n*${product.name}*\n${product.description ? `_${product.description}_\n` : ''}${product.material ? `💍 Material: ${product.material}\n` : ''}💰 Valor: R$ ${((product.isPromo && product.promoPrice) ? product.promoPrice : product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nConfira no link:\n${origin}?catalog=true`;
    return `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  };

  // Formulate order text message and open WhatsApp
  const handleSendOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Generate unique order identification based on timestamp and random digits to guarantee uniqueness
    const orderNumber = `ORD-${Date.now().toString().substring(8)}-${Math.floor(10 + Math.random() * 90)}`;
    const orderDate = new Date().toLocaleDateString('pt-BR');
    const orderTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Save order to database FIRST (if function provided)
    if (onAddSale) {
      const orderId = `order_${orderNumber.toLowerCase()}`;
      const saleOrder = {
        id: orderId,
        customerId: 'balcao',
        customerName: custName.trim() || 'Cliente Catálogo',
        customerPhone: custPhone.trim() || '',
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name + (item.selectedSize ? ` (Tamanho: ${item.selectedSize})` : ''),
          price: (item.product.isPromo && item.product.promoPrice) ? item.product.promoPrice : item.product.price,
          quantity: item.quantity
        })),
        totalAmount: cartTotal,
        paymentMethod: 'order' as const,
        status: 'order' as const,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };
      
      try {
        await onAddSale(saleOrder);
      } catch (err) {
        console.error('Failed to save order to database:', err);
      }
    }

    let text = `✨ *NOVO PEDIDO - ${brandConfig.brandName.toUpperCase()}* ✨\n`;
    text += `🆔 *Identificador:* #${orderNumber}\n`;
    text += `📅 *Data:* ${orderDate} às ${orderTime}\n\n`;
    text += `Olá! Gostaria de encomendar os seguintes itens do catálogo:\n\n`;

    cart.forEach(item => {
      const itemPrice = (item.product.isPromo && item.product.promoPrice) 
        ? item.product.promoPrice 
        : item.product.price;
      const itemTotal = itemPrice * item.quantity;
      const sizeSpec = item.selectedSize ? ` [Tamanho: ${item.selectedSize}]` : '';
      text += `🛍️ *${item.quantity}x ${item.product.name}${sizeSpec}*\n`;
      text += `   Preço: R$ ${itemPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} cada\n`;
      if (item.quantity > 1) {
        text += `   Subtotal: R$ ${itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      }
      text += `\n`;
    });

    text += `💰 *VALOR TOTAL ESTIMADO:* R$ ${cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;

    if (custName.trim()) {
      text += `👤 *Nome do Cliente:* ${custName.trim()}\n`;
    }
    if (custPhone.trim()) {
      text += `📞 *Telefone:* ${custPhone.trim()}\n`;
    }

    text += `\n_A finalização da venda será feita diretamente por aqui! Aguardo seu retorno sobre disponibilidade, entrega e pagamento._ 🥰`;

    const encodedText = encodeURIComponent(text);
    
    // Check if store has configured a WhatsApp number
    let storePhone = brandConfig.whatsAppNumber ? brandConfig.whatsAppNumber.replace(/\D/g, '').trim() : '';
    
    // Auto-prepend Brazil's country code (55) if it is a local number (10 or 11 digits)
    if (storePhone.length === 10 || storePhone.length === 11) {
      storePhone = '55' + storePhone;
    }
    
    const whatsappUrl = storePhone
      ? `https://wa.me/${storePhone}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    // Clear cart and customer info in UI after successful submission
    setCart([]);
    setCustName('');
    setCustPhone('');
    saveCartToStorage([]);

    // Try to open in a new window/tab
    const newWindow = window.open(whatsappUrl, '_blank');
    
    // Fallback: If popup blocker blocks the window, redirect the current window directly so they never get stuck!
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      window.location.href = whatsappUrl;
    }
  };

  // Helper to get image gallery array
  const getProductGallery = (product: Product): string[] => {
    const list = [product.imageUrl];
    if (product.galleryImages && product.galleryImages.length > 0) {
      product.galleryImages.forEach(img => {
        if (img && !list.includes(img)) list.push(img);
      });
    }
    return list;
  };

  // Formatter to render labels (Coleção, Material, etc.) in product description
  const renderFormattedDescription = (desc: string) => {
    if (!desc) return null;
    return desc.split('\n').map((line, idx) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0 && colonIndex < 25) { // reasonable label length
        const label = line.substring(0, colonIndex + 1);
        const value = line.substring(colonIndex + 1);
        return (
          <div key={idx} className="text-xs leading-relaxed py-0.5">
            <strong className="font-bold text-[#2B1F28]">{label}</strong>
            <span className="text-[#7A6872] font-semibold">{value}</span>
          </div>
        );
      }
      return (
        <p key={idx} className="text-xs leading-relaxed text-[#2B1F28] font-medium mt-1">
          {line}
        </p>
      );
    });
  };

  const renderSearchBarAndFilters = () => {
    return (
      <div className="space-y-4 pt-1 flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-serif font-bold text-neutral-800 flex items-center gap-1.5 uppercase tracking-wider">
            <ShoppingBag className="w-4 h-4 text-amber-600 animate-pulse" />
            Nossa Coleção Completa
          </h2>
        </div>

        {/* Beautiful Modern Search Bar */}
        <div className="relative shadow-sm rounded-2xl bg-white border border-neutral-150 p-1 flex items-center pr-3 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/10 transition-all duration-300">
          <div className="p-2.5 text-neutral-400">
            <Search className="w-4.5 h-4.5" />
          </div>
          <input
            id="public-search"
            type="text"
            placeholder="Buscar semijoias, anéis, banho..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-sm outline-none text-neutral-800 py-2.5 placeholder-neutral-400 font-medium"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Badges: Quick Highlight Selectors */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 shrink-0">
          <button
            onClick={() => setSelectedBadge('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${
              selectedBadge === 'all'
                ? 'bg-neutral-900 text-white shadow-md shadow-neutral-900/15'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            💖 Ver Tudo
          </button>
          {newArrivals.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedBadge('new')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-1 ${
                selectedBadge === 'new'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/15'
                  : 'bg-white text-amber-850 border border-amber-200/55 hover:bg-amber-50/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Novidades</span>
              <span className="bg-amber-100 text-amber-800 text-[9px] px-1 rounded-full font-bold">{newArrivals.length}</span>
            </button>
          )}
          {featuredProducts.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedBadge('featured')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-1 ${
                selectedBadge === 'featured'
                  ? 'bg-purple-650 text-white shadow-md shadow-purple-650/15'
                  : 'bg-white text-purple-850 border border-purple-200/55 hover:bg-purple-50/20'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Destaques</span>
              <span className="bg-purple-100 text-purple-800 text-[9px] px-1 rounded-full font-bold">{featuredProducts.length}</span>
            </button>
          )}
          {promotionProducts.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedBadge('promo')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-1 ${
                selectedBadge === 'promo'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/15'
                  : 'bg-white text-rose-850 border border-rose-200/55 hover:bg-rose-50/20'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Ofertas</span>
              <span className="bg-rose-100 text-rose-800 text-[9px] px-1 rounded-full font-bold">{promotionProducts.length}</span>
            </button>
          )}
        </div>

        {/* Scrollable Categories Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 shrink-0">
          {categories.map((cat) => (
            <button
              id={`public-chip-${cat}`}
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-600/10 text-amber-800 border-2 border-amber-600 shadow-xs'
                  : 'bg-neutral-100 text-neutral-500 border border-transparent hover:bg-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div id="public-catalog-container" className="flex-1 overflow-y-auto bg-neutral-50 flex flex-col font-sans relative pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      
      {/* Premium Header Capa */}
      <div 
        className="relative h-36 sm:h-48 shrink-0 overflow-hidden"
        style={{ backgroundImage: 'linear-gradient(135deg, #2B2332 0%, #8B3A55 60%, #C4708A 100%)' }}
      >
        <img 
          id="public-banner"
          src={brandConfig.bannerUrl || "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&auto=format&fit=crop&q=80"}
          alt="Banner da Loja" 
          className="w-full h-full object-cover opacity-45 scale-105 transition-transform duration-1000"
          referrerPolicy="no-referrer"
        />
        
        {/* Soft elegant gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Store Logo & Name */}
        <div className="absolute bottom-3 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 flex items-center gap-3">
          <div className="relative">
            <img 
              id="public-logo"
              src={brandConfig.logoUrl || "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=100&q=80"} 
              alt="Logo" 
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-white/95 shadow-lg object-cover bg-white"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -bottom-1 -right-1 bg-[#C4708A] text-white rounded-full p-0.5 sm:p-1 border border-white shadow-md">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" />
            </span>
          </div>
          <div className="text-white min-w-0 flex-1">
            <span className="inline-block text-[8px] sm:text-[10px] uppercase font-extrabold tracking-widest text-[#F9E0E8] bg-[#2B2332]/40 px-2 py-0.5 rounded-full border border-[#C4708A]/20">Catálogo Interativo</span>
            <h1 className="text-base sm:text-xl font-serif font-bold leading-tight tracking-tight drop-shadow-md truncate mt-0.5 sm:mt-1">{brandConfig.brandName}</h1>
            {brandConfig.slogan && (
              <p className="text-[10px] sm:text-[11px] text-neutral-200 line-clamp-1 italic font-medium mt-0.5 drop-shadow-sm">{brandConfig.slogan}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 space-y-6">

        {/* Promoções (Ofertas) and Novidades Carousels */}
        {selectedBadge === 'all' && selectedCategory === 'Todos' && !searchTerm && (
          <>
            {/* Promoções Section */}
            {promotionProducts.length > 0 && (
              <div className="space-y-2.5 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-serif font-bold text-neutral-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <Tag className="w-4 h-4 text-rose-500 fill-rose-500" />
                    Promoções Imperdíveis 🏷️
                  </h2>
                  <span className="text-[10px] text-rose-600 font-extrabold uppercase tracking-wider">Ofertas</span>
                </div>
                
                <div className="flex space-x-3.5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
                  {promotionProducts.map((p) => {
                    const isFavorite = favorites.includes(p.id);
                    const hasPromo = p.isPromo && p.promoPrice;
                    return (
                      <div 
                        key={p.id}
                        onClick={() => handleOpenDetails(p)}
                        className="w-40 bg-white rounded-2xl overflow-hidden border border-neutral-150 shadow-xs flex-none cursor-pointer hover:shadow-md transition-all duration-300 relative"
                      >
                        {/* Badge */}
                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                          {p.isNew && (
                            <span className="bg-teal-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider">Novo</span>
                          )}
                          {p.isPromo && (
                            <span className="bg-rose-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider">Oferta</span>
                          )}
                        </div>

                        {/* Fav Heart */}
                        <button
                          onClick={(e) => toggleFavorite(p.id, e)}
                          className="absolute top-2 right-2 z-10 bg-white/85 backdrop-blur-xs p-1.5 rounded-full shadow-xs text-rose-500 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500' : ''}`} />
                        </button>

                        <div className="h-32 bg-neutral-100 overflow-hidden relative">
                          <img 
                            src={p.imageUrl} 
                            alt={p.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&q=80';
                            }}
                          />
                        </div>

                        <div className="p-2.5">
                          <h4 className="font-bold text-xs text-neutral-800 line-clamp-2 h-8 whitespace-normal break-words leading-tight">{p.name}</h4>
                          <div className="mt-1 flex flex-col">
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-extrabold text-neutral-900 font-mono">
                                R$ {(hasPromo ? p.promoPrice! : p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {hasPromo && (
                                <span className="text-[10px] text-neutral-400 line-through font-mono">
                                  R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                            {(hasPromo ? p.promoPrice! : p.price) > 30 && (
                              <span className="text-[9px] text-[#7A6872] font-semibold mt-0.5 leading-tight block">
                                3x de R$ {((hasPromo ? p.promoPrice! : p.price) / 3).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => addToCart(p, e)}
                            className="w-full mt-2 bg-brand-olive hover:bg-brand-stone active:scale-95 text-white font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Sacola</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Novidades Section */}
            {newArrivals.length > 0 && (
              <div className="space-y-2.5 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-serif font-bold text-neutral-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                    Novidades da Coleção ✨
                  </h2>
                  <span className="text-[10px] text-amber-650 font-extrabold uppercase tracking-wider">Lançamentos</span>
                </div>
                
                <div className="flex space-x-3.5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
                  {newArrivals.map((p) => {
                    const isFavorite = favorites.includes(p.id);
                    const hasPromo = p.isPromo && p.promoPrice;
                    return (
                      <div 
                        key={p.id}
                        onClick={() => handleOpenDetails(p)}
                        className="w-40 bg-white rounded-2xl overflow-hidden border border-neutral-150 shadow-xs flex-none cursor-pointer hover:shadow-md transition-all duration-300 relative"
                      >
                        {/* Badge */}
                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                          {p.isNew && (
                            <span className="bg-teal-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider">Novo</span>
                          )}
                          {p.isPromo && (
                            <span className="bg-rose-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider">Oferta</span>
                          )}
                        </div>

                        {/* Fav Heart */}
                        <button
                          onClick={(e) => toggleFavorite(p.id, e)}
                          className="absolute top-2 right-2 z-10 bg-white/85 backdrop-blur-xs p-1.5 rounded-full shadow-xs text-rose-500 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500' : ''}`} />
                        </button>

                        <div className="h-32 bg-neutral-100 overflow-hidden relative">
                          <img 
                            src={p.imageUrl} 
                            alt={p.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&q=80';
                            }}
                          />
                        </div>

                        <div className="p-2.5">
                          <h4 className="font-bold text-xs text-neutral-800 line-clamp-2 h-8 whitespace-normal break-words leading-tight">{p.name}</h4>
                          <div className="mt-1 flex flex-col">
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-extrabold text-neutral-900 font-mono">
                                R$ {(hasPromo ? p.promoPrice! : p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {hasPromo && (
                                <span className="text-[10px] text-neutral-400 line-through font-mono">
                                  R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                            {(hasPromo ? p.promoPrice! : p.price) > 30 && (
                              <span className="text-[9px] text-[#7A6872] font-semibold mt-0.5 leading-tight block">
                                3x de R$ {((hasPromo ? p.promoPrice! : p.price) / 3).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => addToCart(p, e)}
                            className="w-full mt-2 bg-brand-olive hover:bg-brand-stone active:scale-95 text-white font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Sacola</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Seção 4: Catálogo Completo */}
        {renderSearchBarAndFilters()}

        {/* Products Title */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
            {searchTerm ? `Resultados da busca` : `Catálogo de Peças`}
          </span>
          <span className="text-[11px] font-mono text-neutral-500 font-semibold">{filteredProducts.length} peças encontradas</span>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-neutral-150 p-10 text-center my-6 space-y-3.5">
            <HelpCircle className="w-12 h-12 text-neutral-300 mx-auto animate-pulse" />
            <h3 className="text-base font-bold text-neutral-800">Nenhum produto disponível</h3>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
              Não encontramos nenhuma semijoia que combine com seus filtros ou termos de pesquisa no momento.
            </p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('Todos'); setSelectedBadge('all'); }}
              className="text-xs bg-amber-650 text-white font-bold px-4 py-2 rounded-xl"
            >
              Redefinir Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredProducts.map((p) => {
              const isFavorite = favorites.includes(p.id);
              const hasPromo = p.isPromo && p.promoPrice;
              const hasGallery = p.galleryImages && p.galleryImages.length > 0;
              const isOutOfStock = p.estoque !== undefined && p.estoque !== null && p.estoque <= 0;
              const cartItemsOfThisProduct = cart.filter(item => item.product.id === p.id);
              const productQtyInCart = cartItemsOfThisProduct.reduce((acc, curr) => acc + curr.quantity, 0);
              
              return (
                <div 
                  id={`public-card-${p.id}`}
                  key={p.id}
                  onClick={() => handleOpenDetails(p)}
                  className="bg-white rounded-2xl overflow-hidden border border-neutral-150 shadow-sm hover:shadow-md transition-all p-3 flex gap-4 relative cursor-pointer group active:scale-[0.99]"
                >
                  {/* Photo Container */}
                  <div className="relative w-24 h-24 rounded-xl bg-neutral-100 overflow-hidden shrink-0 shadow-inner">
                    <img 
                      src={p.imageUrl} 
                      alt={p.name} 
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'opacity-45 grayscale' : ''}`}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&q=80';
                      }}
                    />
                    
                    {/* Badge Pill overlay */}
                    <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-10">
                      <span className="bg-[#C4708A]/95 backdrop-blur-xs text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-md border border-white/20">
                        {p.category}
                      </span>
                      {p.isNew && (
                        <span className="bg-[#2B2332]/95 backdrop-blur-xs text-[#F9E0E8] font-extrabold text-[7px] px-1 py-0.5 rounded-md border border-[#E8D5DC]/20 uppercase tracking-widest text-center">New</span>
                      )}
                      {isOutOfStock && (
                        <span className="bg-rose-650 text-white font-extrabold text-[7px] px-1 py-0.5 rounded-md border border-rose-350/20 uppercase tracking-widest text-center">Esgotado</span>
                      )}
                    </div>

                    {/* Gallery indicator icon */}
                    {hasGallery && (
                      <span className="absolute bottom-1 right-1 bg-neutral-900/70 text-white p-1 rounded-md text-[8px] font-bold flex items-center gap-0.5">
                        <Eye className="w-2.5 h-2.5" />
                        +{p.galleryImages!.length}
                      </span>
                    )}

                    {/* Out of Stock Overlay Text */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] flex items-center justify-center">
                        <span className="bg-neutral-950/75 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-md tracking-wider">Esgotado</span>
                      </div>
                    )}
                  </div>

                  {/* Details Container */}
                  <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-serif font-bold text-sm text-neutral-800 whitespace-normal break-words pr-4 leading-snug line-clamp-2">{p.name}</h3>
                        <button
                          onClick={(e) => toggleFavorite(p.id, e)}
                          className="text-[#C4708A] hover:text-[#8B3A55] p-0.5 shrink-0"
                        >
                          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#C4708A]' : ''}`} />
                        </button>
                      </div>
                      
                      {/* Technical tags */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.material && (
                          <span className="bg-[#F2E4EA] text-[#7A6872] text-[8.5px] font-semibold px-2 py-0.5 rounded-md">
                            💍 {p.material}
                          </span>
                        )}
                        {p.size && (
                          <span className="bg-[#F2E4EA] text-[#7A6872] text-[8.5px] font-semibold px-2 py-0.5 rounded-md">
                            📏 {p.size}
                          </span>
                        )}
                        {p.estoque !== undefined && p.estoque !== null && p.estoque > 0 && p.estoque <= 3 && (
                          <span className="bg-amber-100 text-amber-800 text-[8.5px] font-extrabold px-2 py-0.5 rounded-md">
                            ⚡ Só {p.estoque} restando!
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#7A6872] line-clamp-2 mt-1.5 leading-relaxed whitespace-pre-line">
                        {p.description || "Sem descrição disponível."}
                      </p>
                    </div>

                    <div className="flex items-end justify-between gap-1.5 mt-2 shrink-0">
                      <div>
                        {hasPromo ? (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-rose-500 font-extrabold uppercase tracking-wide leading-none mb-0.5">Promoção</span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-extrabold text-neutral-950 font-mono">
                                R$ {p.promoPrice!.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-xs text-neutral-400 line-through font-mono">
                                R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {p.promoPrice! > 30 && (
                              <span className="text-[10px] text-[#7A6872] font-semibold leading-none mt-0.5 block">
                                3x de R$ {(p.promoPrice! / 3).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-[9px] text-neutral-450 block font-semibold leading-none">Preço</span>
                            <span className="text-base font-extrabold text-neutral-950 font-mono block">
                              R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {p.price > 30 && (
                              <span className="text-[10px] text-[#7A6872] font-semibold leading-none mt-0.5 block">
                                3x de R$ {(p.price / 3).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {isOutOfStock ? (
                        <button
                          disabled
                          onClick={(e) => e.stopPropagation()}
                          className="bg-neutral-100 text-neutral-400 font-extrabold text-xs px-3 py-2 rounded-xl cursor-not-allowed shrink-0 border border-neutral-200"
                        >
                          Indisponível
                        </button>
                      ) : productQtyInCart > 0 ? (
                        <div className="flex items-center bg-[#F9E0E8] border border-[#E8D5DC] rounded-xl px-1 py-0.5 shadow-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const itemToDec = cart.find(item => item.product.id === p.id);
                              if (itemToDec) {
                                updateQuantity(p.id, -1, e, itemToDec.selectedSize);
                              }
                            }}
                            className="p-1.5 text-[#8B3A55] hover:bg-[#F9E0E8]/80 rounded-lg transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-bold text-[#8B3A55] min-w-4 text-center">{productQtyInCart}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const isRing = p.category.toLowerCase().includes('anel') || p.category.toLowerCase().includes('anéis');
                              const hasSizes = p.size && p.size.trim().length > 0;
                              if (isRing || hasSizes) {
                                handleOpenDetails(p);
                              } else {
                                addToCart(p, e);
                              }
                            }}
                            className="p-1.5 text-[#8B3A55] hover:bg-[#F9E0E8]/80 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const isRing = p.category.toLowerCase().includes('anel') || p.category.toLowerCase().includes('anéis');
                            const hasSizes = p.size && p.size.trim().length > 0;
                            if (isRing || hasSizes) {
                              handleOpenDetails(p);
                            } else {
                              addToCart(p, e);
                            }
                          }}
                          className="bg-[#C4708A] hover:bg-[#8B3A55] text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>+ Sacola</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Bottom Floating Bar with Sacola / Cart Trigger */}
      <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-md w-full bg-white/95 backdrop-blur-md border-t border-neutral-200/85 shrink-0 z-40 flex items-center justify-between p-4 px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] rounded-t-2xl shadow-xl">
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-widest">Sua Sacola</span>
          <span className="text-lg font-black text-amber-900 font-mono">
            R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-extrabold text-sm py-3 px-5.5 rounded-2xl flex items-center gap-2 shadow-md transition-all cursor-pointer relative"
        >
          <ShoppingBag className="w-5 h-5" />
          <span>Ver Sacola</span>
          {cartItemsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 border-2 border-white text-white rounded-full text-[10px] font-black w-6 h-6 flex items-center justify-center shadow-md animate-bounce">
              {cartItemsCount}
            </span>
          )}
        </button>
      </div>

      {/* PRODUCT DETAILS FLOATING DRAWER MODAL */}
      {selectedProduct && (() => {
        const gallery = getProductGallery(selectedProduct);
        const hasPromo = selectedProduct.isPromo && selectedProduct.promoPrice;
        const finalPrice = hasPromo ? selectedProduct.promoPrice! : selectedProduct.price;
        const discountRate = hasPromo ? Math.round(((selectedProduct.price - selectedProduct.promoPrice!) / selectedProduct.price) * 100) : 0;
        const cartItem = cart.find(item => item.product.id === selectedProduct.id);
        const isFavorite = favorites.includes(selectedProduct.id);

        return (
          <div className="fixed inset-0 bg-neutral-900/65 backdrop-blur-xs z-50 flex items-end justify-center animate-fade-in">
            <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[92vh] md:max-h-[85vh] overflow-hidden p-0 shadow-2xl flex flex-col border-t border-neutral-100 animate-slide-up relative">
              
              {/* Sticky Close Trigger */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/90 backdrop-blur-xs shadow-md text-neutral-700 hover:text-neutral-900 hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Scrollable Content Part */}
              <div className="flex-1 overflow-y-auto pb-10">
                {/* Swipe Gallery Image Showcase */}
              <div className="relative h-80 bg-neutral-100 overflow-hidden shrink-0 border-b border-neutral-100">
                <img 
                  src={gallery[activeImageIndex]} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover transition-all duration-300"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&q=80';
                  }}
                />

                {/* Left/Right Buttons if multiple photos */}
                {gallery.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex(prev => prev === 0 ? gallery.length - 1 : prev - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/75 backdrop-blur-xs text-neutral-800 p-2 rounded-full shadow-md hover:bg-white transition-all active:scale-90"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex(prev => prev === gallery.length - 1 ? 0 : prev + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/75 backdrop-blur-xs text-neutral-800 p-2 rounded-full shadow-md hover:bg-white transition-all active:scale-90"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Overlaid Badges */}
                <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-1.5">
                  <span className="bg-amber-600/90 backdrop-blur-xs text-white text-[10px] font-extrabold px-3 py-1 rounded-md shadow-xs">
                    {selectedProduct.category}
                  </span>
                  {selectedProduct.isNew && (
                    <span className="bg-teal-500/90 backdrop-blur-xs text-white text-[10px] font-extrabold px-3 py-1 rounded-md shadow-xs uppercase tracking-wider">
                      ✨ Novidade
                    </span>
                  )}
                  {hasPromo && (
                    <span className="bg-rose-600/90 backdrop-blur-xs text-white text-[10px] font-extrabold px-3 py-1 rounded-md shadow-xs uppercase tracking-wider">
                      🏷️ Promoção (-{discountRate}%)
                    </span>
                  )}
                  {selectedProduct.isFeatured && (
                    <span className="bg-purple-650/90 backdrop-blur-xs text-white text-[10px] font-extrabold px-3 py-1 rounded-md shadow-xs uppercase tracking-wider">
                      🔥 Best Seller
                    </span>
                  )}
                </div>

                {/* Dots indicator */}
                {gallery.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full flex gap-1 z-10">
                    {gallery.map((_, idx) => (
                      <span 
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${activeImageIndex === idx ? 'bg-white scale-125' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Miniature Previews beneath gallery (if multiple images) */}
              {gallery.length > 1 && (
                <div className="flex gap-2 px-5 py-3 overflow-x-auto border-b border-neutral-100 bg-neutral-50/50 shrink-0 scrollbar-none">
                  {gallery.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-none bg-white ${activeImageIndex === idx ? 'border-amber-600 scale-95 shadow-sm' : 'border-neutral-200 opacity-60'}`}
                    >
                      <img 
                        src={img} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&q=80';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Product Info Section */}
              <div className="p-5 space-y-4">
                
                {/* Title & Pricing */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-serif font-extrabold text-lg text-neutral-800 leading-tight whitespace-normal break-words">{selectedProduct.name}</h3>
                    <div className="flex flex-col gap-1 mt-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-neutral-900 font-mono">
                          R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        {hasPromo && (
                          <span className="text-sm text-neutral-450 line-through font-mono">
                            R$ {selectedProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#7A6872] font-semibold">
                        ou 3x de R$ {(finalPrice / 3).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros no cartão
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => toggleFavorite(selectedProduct.id, e)}
                    className="p-2.5 bg-[#F9E0E8] hover:bg-[#F2E4EA] rounded-full text-[#C4708A] border border-[#E8D5DC] transition-colors cursor-pointer shrink-0"
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-[#C4708A]' : ''}`} />
                  </button>
                </div>

                {/* Compartilhar Button */}
                <div className="bg-[#F2E4EA]/55 border border-[#E8D5DC]/60 p-2.5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#C4708A] shrink-0" />
                    <span className="text-[11px] text-[#7A6872] font-medium">Gostou e quer mostrar para uma amiga?</span>
                  </div>
                  <a
                    href={getShareLink(selectedProduct)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#C4708A] hover:bg-[#8B3A55] text-white font-bold text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs transition-transform active:scale-95 whitespace-nowrap cursor-pointer"
                  >
                    <Share2 className="w-3 h-3" />
                    Compartilhar
                  </a>
                </div>

                {/* Size Selector for Rings/All items with size field */}
                {(() => {
                  const isRing = selectedProduct.category.toLowerCase().includes('anel') || selectedProduct.category.toLowerCase().includes('anéis');
                  const hasSizes = selectedProduct.size && selectedProduct.size.trim().length > 0;
                  
                  const sizesList = hasSizes 
                    ? selectedProduct.size!.split(',').map(s => s.trim()).filter(Boolean)
                    : (isRing ? ['12', '14', '16', '18', '20', '22'] : []);

                  if (sizesList.length === 0) return null;

                  return (
                    <div className="bg-[#F2E4EA]/30 border border-[#E8D5DC]/45 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#2B1F28] flex items-center gap-1">
                          📏 Selecione o Tamanho:
                        </span>
                        {isRing && (
                          <a 
                            href="https://www.google.com/search?q=como+saber+tamanho+do+anel" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] font-bold text-[#C4708A] hover:underline"
                          >
                            Guia de Medidas
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sizesList.map((sz) => (
                          <button
                            type="button"
                            key={sz}
                            onClick={() => setSelectedSize(sz)}
                            className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                              selectedSize === sz 
                                ? 'bg-[#C4708A] text-white shadow-md shadow-[#C4708A]/15 scale-105' 
                                : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Description */}
                <div>
                  <h4 className="text-[10px] font-extrabold text-[#7A6872] uppercase tracking-widest mb-1.5">Descrição do Produto</h4>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E8D5DC] font-medium space-y-1">
                    {renderFormattedDescription(selectedProduct.description || "Esta linda semijoia é delicada, elegante e perfeita para dar um toque especial ao seu visual cotidianamente.")}
                  </div>
                </div>

                {/* Technical Specifications (Ficha Técnica) */}
                {(selectedProduct.material || selectedProduct.finish || selectedProduct.size) && (
                  <div>
                    <h4 className="text-[10px] font-extrabold text-[#7A6872] uppercase tracking-widest mb-1.5">Ficha Técnica</h4>
                    <div className="bg-white border border-[#E8D5DC] rounded-2xl overflow-hidden text-xs">
                      {selectedProduct.material && (
                        <div className="grid grid-cols-3 border-b border-[#E8D5DC]/55 p-2.5">
                          <span className="font-bold text-[#7A6872] uppercase text-[9px] tracking-wide self-center">Material</span>
                          <span className="col-span-2 font-semibold text-[#2B1F28]">{selectedProduct.material}</span>
                        </div>
                      )}
                      {selectedProduct.finish && (
                        <div className="grid grid-cols-3 border-b border-[#E8D5DC]/55 p-2.5">
                          <span className="font-bold text-[#7A6872] uppercase text-[9px] tracking-wide self-center">Acabamento</span>
                          <span className="col-span-2 font-semibold text-[#2B1F28]">{selectedProduct.finish}</span>
                        </div>
                      )}
                      {selectedProduct.size && (
                        <div className="grid grid-cols-3 p-2.5">
                          <span className="font-bold text-[#7A6872] uppercase text-[9px] tracking-wide self-center">Medida</span>
                          <span className="col-span-2 font-semibold text-[#2B1F28]">{selectedProduct.size}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Care & Maintenance instructions */}
                {selectedProduct.careInstructions && (
                  <div>
                    <h4 className="text-[10px] font-extrabold text-[#7A6872] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-[#C4708A]" />
                      Dicas de Cuidado e Conservação
                    </h4>
                    <p className="text-[11px] text-[#8B3A55] bg-[#F9E0E8]/40 border border-[#E8D5DC]/55 p-3.5 rounded-2xl leading-relaxed italic">
                      "{selectedProduct.careInstructions}"
                    </p>
                  </div>
                )}

              </div>

              </div>

              {/* Float Order Trigger Bar inside details */}
              {(() => {
                const specificSizeCartItem = cart.find(item => item.product.id === selectedProduct.id && item.selectedSize === (selectedSize || undefined));
                const itemQty = specificSizeCartItem ? specificSizeCartItem.quantity : 1;
                const isOutOfStock = selectedProduct.estoque !== undefined && selectedProduct.estoque !== null && selectedProduct.estoque <= 0;
                
                return (
                  <div className="p-4 px-5 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 flex items-center justify-between gap-3 shrink-0 z-40 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-[#7A6872] font-extrabold uppercase">Total</span>
                      <span className="text-base font-black text-[#2B1F28] font-mono">
                        R$ {(itemQty * finalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {isOutOfStock ? (
                      <button
                        disabled
                        className="flex-1 bg-neutral-150 text-neutral-400 font-extrabold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed shadow-none"
                      >
                        Indisponível
                      </button>
                    ) : specificSizeCartItem ? (
                      <div className="flex items-center bg-[#F9E0E8] border border-[#E8D5DC] rounded-2xl p-1 shadow-xs flex-1 max-w-[150px] justify-between">
                        <button
                          onClick={(e) => updateQuantity(selectedProduct.id, -1, e, selectedSize || undefined)}
                          className="p-1.5 text-[#8B3A55] hover:bg-[#F9E0E8]/85 rounded-lg transition-colors cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-3 text-sm font-extrabold text-[#8B3A55] min-w-5 text-center">{specificSizeCartItem.quantity}</span>
                        <button
                          onClick={(e) => updateQuantity(selectedProduct.id, 1, e, selectedSize || undefined)}
                          className="p-1.5 text-[#8B3A55] hover:bg-[#F9E0E8]/85 rounded-lg transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          addToCart(selectedProduct, e, selectedSize || undefined);
                        }}
                        className="flex-1 bg-[#C4708A] hover:bg-[#8B3A55] active:scale-[0.97] text-white font-extrabold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Adicionar à Sacola
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* SHOPPING CART SACULA DRAWER / MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-end justify-center animate-fade-in">
          <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[92vh] md:max-h-[85vh] p-4 sm:p-6 shadow-2xl flex flex-col border-t border-neutral-100 animate-slide-up relative overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-neutral-800">Sua Sacola de Compras</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-10 space-y-3.5 flex-1 flex flex-col justify-center items-center">
                <div className="p-3 bg-neutral-50 rounded-full w-14 h-14 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-neutral-350" />
                </div>
                <p className="text-neutral-400 text-sm font-medium">Sua sacola de compras está vazia.</p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-amber-600 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs"
                >
                  Voltar para o catálogo
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendOrder} className="flex-1 flex flex-col min-h-0">
                {/* Scrollable Container */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 -mr-1">
                  
                  {/* Cart Items List */}
                  <div className="space-y-3">
                    {cart.map(item => {
                      const itemPrice = (item.product.isPromo && item.product.promoPrice) 
                        ? item.product.promoPrice 
                        : item.product.price;
                      return (
                        <div 
                          id={`cart-item-${item.product.id}-${item.selectedSize || 'default'}`}
                          key={`${item.product.id}-${item.selectedSize || 'default'}`}
                          className="flex gap-3 items-center bg-neutral-50 rounded-xl p-2.5 border border-neutral-150"
                        >
                          <img 
                            src={item.product.imageUrl} 
                            alt={item.product.name} 
                            className="w-12 h-12 rounded-lg object-cover bg-neutral-100 shrink-0 border border-neutral-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-neutral-800 truncate">{item.product.name}</h4>
                            {item.selectedSize && (
                              <span className="block text-[10px] text-[#C4708A] font-bold leading-none mt-0.5 mb-1">
                                Tamanho: {item.selectedSize}
                              </span>
                            )}
                            <span className="text-[11px] text-[#8B3A55] font-mono font-bold">
                              R$ {itemPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5 shadow-xs">
                            <button
                              type="button"
                              onClick={(e) => updateQuantity(item.product.id, -1, e, item.selectedSize)}
                              className="p-1 text-neutral-500 hover:bg-neutral-100 rounded cursor-pointer animate-none"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-1.5 text-xs font-bold text-neutral-800 min-w-4 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={(e) => updateQuantity(item.product.id, 1, e, item.selectedSize)}
                              className="p-1 text-neutral-500 hover:bg-neutral-100 rounded cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => removeFromCart(item.product.id, e, item.selectedSize)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Customer Details Inputs */}
                  <div className="border-t border-neutral-100 pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Seu Nome *</label>
                        <input
                          id="cart-customer-name"
                          type="text"
                          required
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          placeholder="Seu nome completo"
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:bg-white outline-none text-neutral-800 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Seu Telefone (opcional)</label>
                        <input
                          id="cart-customer-phone"
                          type="tel"
                          value={custPhone}
                          onChange={(e) => setCustPhone(e.target.value)}
                          placeholder="DDD + Telefone"
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:bg-white outline-none text-neutral-800 font-medium"
                        />
                      </div>
                    </div>

                    {/* Subtotal & Total */}
                    <div className="bg-amber-50/55 border border-amber-100 p-3.5 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900">Total do Pedido:</span>
                      <span className="text-lg font-black text-neutral-950 font-mono">
                        R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Sticky Bottom Submit Button Area */}
                <div className="border-t border-neutral-150 pt-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Send className="w-5 h-5 fill-white" />
                    <span>Enviar Pedido pelo WhatsApp</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
