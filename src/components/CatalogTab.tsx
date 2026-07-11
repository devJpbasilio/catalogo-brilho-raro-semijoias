/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product, Customer, Sale, BrandConfig } from '../types';
import ConfirmModal from './ConfirmModal';
import { 
  Search, Plus, Tag, ToggleLeft, ToggleRight, Trash2, Edit3, 
  ShoppingBag, Check, X, Sparkles, AlertCircle,
  Share2, Copy, Send, ChevronDown, ChevronUp, Upload, Star, Download
} from 'lucide-react';
import { compressAndResizeImage } from '../lib/image-utils';
import { uploadImage } from '../lib/storage';

interface CatalogTabProps {
  products: Product[];
  customers: Customer[];
  brandConfig: BrandConfig;
  onSaveProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAddSale: (sale: Sale) => Promise<void>;
  onAddCustomer: (customer: Customer) => Promise<void>;
}

// Safe clipboard copy function that works beautifully inside iframe sandboxes
async function safeCopyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('Navigator clipboard failed, falling back to textarea copy:', e);
    }
  }
  
  // Fallback using temporary textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  }
}

// Helper to get public URL origin for clients, replacing private dev URLs with public preview URLs
function getPublicOrigin(): string {
  const origin = window.location.origin;
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin;
}

// Preset luxury jewellery photos from Unsplash for easy creation
const IMAGE_PRESETS = [
  { name: 'Argola de Ouro', url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&q=80' },
  { name: 'Colar de Pérola / Veneziana', url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&q=80' },
  { name: 'Anel Solitário Cristal', url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&q=80' },
  { name: 'Pulseira de Elos', url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&q=80' },
  { name: 'Tornozeleira Asa / Prata', url: 'https://images.unsplash.com/photo-1543294001-f7cbfe92237e?w=500&q=80' },
  { name: 'Conjunto Gota Fusion', url: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=500&q=80' },
];

export default function CatalogTab({
  products,
  customers,
  brandConfig,
  onSaveProduct,
  onDeleteProduct,
  onAddSale,
  onAddCustomer
}: CatalogTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [quickSaleProduct, setQuickSaleProduct] = useState<Product | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // New Product form state
  const [prodName, setProdName] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState(IMAGE_PRESETS[0].url);
  const [prodIsAvailable, setProdIsAvailable] = useState(true);
  const [imageTab, setImageTab] = useState<'preset' | 'custom' | 'upload'>('preset');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Advanced premium catalog states
  const [prodGalleryText, setProdGalleryText] = useState('');
  const [prodMaterial, setProdMaterial] = useState('');
  const [prodFinish, setProdFinish] = useState('');
  const [prodSize, setProdSize] = useState('');
  const [prodCareInstructions, setProdCareInstructions] = useState('');
  const [prodIsNew, setProdIsNew] = useState(false);
  const [prodIsPromo, setProdIsPromo] = useState(false);
  const [prodIsFeatured, setProdIsFeatured] = useState(false);
  const [prodPromoPrice, setProdPromoPrice] = useState('');
  const [prodEstoque, setProdEstoque] = useState('');
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  // Quick Sale form state
  const [saleCustomerId, setSaleCustomerId] = useState('balcao');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [salePaymentMethod, setSalePaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const categories = useMemo(() => {
    return ['Todos', ...(brandConfig.categories || [])];
  }, [brandConfig]);

  // Memoized formatted text catalog message for option 2 share and copy
  const textCatalogMessage = useMemo(() => {
    const available = products.filter(p => p.isAvailable);
    if (available.length === 0) return 'Nenhuma semijoia disponível cadastrada.';
    let text = `✨ *Catálogo - ${brandConfig.brandName}* ✨\n`;
    text += `Dê uma olhada nas nossas semijoias disponíveis no momento:\n\n`;
    
    const catsInProducts = Array.from(new Set(available.map(p => p.category)));
    catsInProducts.forEach(cat => {
      const catProds = available.filter(p => p.category === cat);
      if (catProds.length > 0) {
        text += `*🔹 ${cat.toUpperCase()}*\n`;
        catProds.forEach(p => {
          text += `▪️ *${p.name}* - R$ ${p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
          if (p.description) text += `   _${p.description}_\n`;
        });
        text += `\n`;
      }
    });
    const publicUrl = `${getPublicOrigin()}?catalog=true`;
    text += `👉 *Catálogo de Fotos Interativo:*\nAcesse, monte sua sacola e me envie de volta:\n${publicUrl}\n\n`;
    text += `Fico aguardando sua escolha! 🥰`;
    return text;
  }, [products, brandConfig]);

  // Handle open modal for product creation
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDescription('');
    setProdCategory(brandConfig.categories[0] || 'Brincos');
    setProdPrice('');
    setProdImageUrl(IMAGE_PRESETS[0].url);
    setProdIsAvailable(true);
    setImageTab('preset');
    setUploadedImages([]);
    
    // Clear advanced fields
    setProdGalleryText('');
    setProdMaterial('');
    setProdFinish('');
    setProdSize('');
    setProdCareInstructions('');
    setProdIsNew(false);
    setProdIsPromo(false);
    setProdIsFeatured(false);
    setProdPromoPrice('');
    setProdEstoque('');
    setShowAdvancedFields(false);
    
    setIsProductModalOpen(true);
  };

  // Handle open modal for editing
  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdDescription(product.description);
    setProdCategory(product.category);
    setProdPrice(product.price.toString());
    setProdImageUrl(product.imageUrl);
    setProdIsAvailable(product.isAvailable);
    
    // Load uploaded/existing images for device upload preview list
    const existingImages: string[] = [];
    if (product.imageUrl) {
      existingImages.push(product.imageUrl);
    }
    if (product.galleryImages) {
      product.galleryImages.forEach(img => {
        if (img && !existingImages.includes(img)) {
          existingImages.push(img);
        }
      });
    }
    setUploadedImages(existingImages);

    // Load advanced fields from product
    setProdGalleryText(product.galleryImages ? product.galleryImages.join(', ') : '');
    setProdMaterial(product.material || '');
    setProdFinish(product.finish || '');
    setProdSize(product.size || '');
    setProdCareInstructions(product.careInstructions || '');
    setProdIsNew(!!product.isNew);
    setProdIsPromo(!!product.isPromo);
    setProdIsFeatured(!!product.isFeatured);
    setProdPromoPrice(product.promoPrice !== undefined ? product.promoPrice.toString() : '');
    setProdEstoque(product.estoque !== undefined && product.estoque !== null ? product.estoque.toString() : '');
    setShowAdvancedFields(false);
    
    const isPreset = IMAGE_PRESETS.some(p => p.url === product.imageUrl);
    const isBase64 = product.imageUrl && product.imageUrl.startsWith('data:');
    setImageTab(isPreset ? 'preset' : (isBase64 ? 'upload' : 'custom'));
    setIsProductModalOpen(true);
  };

  // Save product
  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice.trim()) return;

    // Clean and parse product price
    let cleanPrice = prodPrice.trim();
    cleanPrice = cleanPrice.replace(/r\$\s*/i, '');
    if (cleanPrice.includes(',') && cleanPrice.includes('.')) {
      cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
    } else if (cleanPrice.includes(',')) {
      cleanPrice = cleanPrice.replace(',', '.');
    }
    cleanPrice = cleanPrice.replace(/[^\d.]/g, '');
    
    const parsedPrice = parseFloat(cleanPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('Por favor, insira um preço válido.');
      return;
    }

    // Build gallery images:
    // 1. Any manual comma-separated URLs in prodGalleryText
    const manualGallery = prodGalleryText
      ? prodGalleryText.split(',').map(url => url.trim()).filter(url => url.length > 0)
      : [];

    // 2. Any uploadedImages that are NOT the main image
    const uploadGallery = uploadedImages.filter(url => url !== prodImageUrl);

    // Merge them and filter out any duplicates
    const finalGallery: string[] = [];
    [...uploadGallery, ...manualGallery].forEach(url => {
      if (url && !finalGallery.includes(url)) {
        finalGallery.push(url);
      }
    });

    const galleryImages = finalGallery.length > 0 ? finalGallery : undefined;
    
    // Ensure we have a main image if there are uploaded images
    let finalImageUrl = prodImageUrl;
    if (!finalImageUrl && uploadedImages.length > 0) {
      finalImageUrl = uploadedImages[0];
    }

    let parsedPromoPrice: number | undefined = undefined;
    if (prodIsPromo && prodPromoPrice) {
      let cleanPromoPrice = prodPromoPrice.trim().replace(/r\$\s*/i, '');
      if (cleanPromoPrice.includes(',') && cleanPromoPrice.includes('.')) {
        cleanPromoPrice = cleanPromoPrice.replace(/\./g, '').replace(',', '.');
      } else if (cleanPromoPrice.includes(',')) {
        cleanPromoPrice = cleanPromoPrice.replace(',', '.');
      }
      cleanPromoPrice = cleanPromoPrice.replace(/[^\d.]/g, '');
      const p = parseFloat(cleanPromoPrice);
      if (!isNaN(p) && p > 0) {
        parsedPromoPrice = p;
      }
    }

    const generateUniqueCode = () => {
      const existingCodes = new Set(products.map(p => p.code).filter(Boolean));
      let generatedCode = '';
      do {
        generatedCode = 'SJ-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      } while (existingCodes.has(generatedCode));
      return generatedCode;
    };

    const finalCode = editingProduct?.code || generateUniqueCode();

    const parsedEstoque = prodEstoque.trim() === '' ? null : parseInt(prodEstoque.trim(), 10);

    const productData: Product = {
      id: editingProduct ? editingProduct.id : `prod_${Math.random().toString(36).substring(2, 11)}`,
      code: finalCode,
      name: prodName.trim(),
      description: prodDescription.trim(),
      category: prodCategory,
      price: parsedPrice,
      imageUrl: finalImageUrl || 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&q=80',
      isAvailable: prodIsAvailable,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      galleryImages,
      material: prodMaterial.trim() || undefined,
      finish: prodFinish.trim() || undefined,
      size: prodSize.trim() || undefined,
      careInstructions: prodCareInstructions.trim() || undefined,
      isNew: prodIsNew,
      isPromo: prodIsPromo,
      isFeatured: prodIsFeatured,
      promoPrice: parsedPromoPrice,
      estoque: isNaN(Number(parsedEstoque)) ? null : parsedEstoque
    };

    try {
      await onSaveProduct(productData);
      setIsProductModalOpen(false);
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      alert(`Não foi possível salvar a semijoia. Detalhes: ${error?.message || error}`);
    }
  };

  // Device File Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>, isDrop = false) => {
    let files: FileList | null = null;
    if (isDrop) {
      e.preventDefault();
      const dragEvent = e as React.DragEvent<HTMLDivElement>;
      files = dragEvent.dataTransfer.files;
    } else {
      const changeEvent = e as React.ChangeEvent<HTMLInputElement>;
      files = changeEvent.target.files;
    }

    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newBase64s: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64 = await compressAndResizeImage(file);
        // Em modo nuvem, sobe para o Storage e guarda a URL; local mantém base64.
        const url = await uploadImage(base64, 'products');
        newBase64s.push(url);
      } catch (err) {
        console.error('Error processing image:', err);
        alert(err instanceof Error ? err.message : 'Erro ao processar imagem.');
      }
    }

    if (newBase64s.length > 0) {
      setUploadedImages(prev => {
        const updated = [...prev, ...newBase64s];
        // If there was no main image selected yet, or it is a generic preset, make the first uploaded one the main image
        const isPreset = IMAGE_PRESETS.some(p => p.url === prodImageUrl);
        if (!prodImageUrl || isPreset || prodImageUrl === '') {
          setProdImageUrl(newBase64s[0]);
        }
        return updated;
      });
    }

    setIsUploading(false);
  };

  const handleSetMainImage = (url: string) => {
    setProdImageUrl(url);
  };

  const handleRemoveImage = (urlToRemove: string) => {
    setUploadedImages(prev => {
      const updated = prev.filter(url => url !== urlToRemove);
      
      // If we removed the image that was set as the main image, pick another one
      if (prodImageUrl === urlToRemove) {
        if (updated.length > 0) {
          setProdImageUrl(updated[0]);
        } else {
          setProdImageUrl('');
        }
      }
      return updated;
    });
  };

  // Toggle availability directly
  const handleToggleAvailability = async (product: Product) => {
    await onSaveProduct({
      ...product,
      isAvailable: !product.isAvailable
    });
  };

  // Quick Sale submission
  const handleQuickSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSaleProduct) return;

    let finalCustomerId = saleCustomerId;
    let finalCustomerName = 'Venda Balcão (Avulso)';
    let finalCustomerPhone = '';

    if (showNewCustomerForm) {
      if (!newCustName.trim()) {
        alert('Por favor, insira o nome do cliente.');
        return;
      }
      const newId = `cust_${Math.random().toString(36).substring(2, 11)}`;
      await onAddCustomer({
        id: newId,
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        createdAt: new Date().toISOString()
      });
      finalCustomerId = newId;
      finalCustomerName = newCustName.trim();
      finalCustomerPhone = newCustPhone.trim();
    } else if (saleCustomerId !== 'balcao') {
      const customer = customers.find(c => c.id === saleCustomerId);
      if (customer) {
        finalCustomerName = customer.name;
        finalCustomerPhone = customer.phone;
      }
    }

    // A sale pending (fiado) must always be linked to a real customer
    if (salePaymentMethod === 'credit' && finalCustomerId === 'balcao') {
      alert('Para vendas no fiado (crédito), selecione ou cadastre um cliente.');
      return;
    }

    // Validate stock
    if (quickSaleProduct.estoque !== undefined && quickSaleProduct.estoque !== null) {
      if (quickSaleProduct.estoque < saleQuantity) {
        alert(`Estoque insuficiente! Apenas ${quickSaleProduct.estoque} unidade(s) disponível(is) no estoque.`);
        return;
      }
    }

    const saleTotal = quickSaleProduct.price * saleQuantity;

    const saleId = 'SALE_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const newSale: Sale = {
      id: saleId,
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      items: [{
        productId: quickSaleProduct.id,
        productName: quickSaleProduct.name,
        price: quickSaleProduct.price,
        quantity: saleQuantity
      }],
      totalAmount: saleTotal,
      paymentMethod: salePaymentMethod,
      status: salePaymentMethod === 'cash' ? 'paid' : 'pending',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    await onAddSale(newSale);
    
    // Reset state & close
    setIsQuickSaleOpen(false);
    setQuickSaleProduct(null);
    setSaleCustomerId('balcao');
    setNewCustName('');
    setNewCustPhone('');
    setSaleQuantity(1);
    setSalePaymentMethod('cash');
    setShowNewCustomerForm(false);
  };

  // Export products to a CSV file (compatible with Excel)
  const handleExportProducts = () => {
    if (products.length === 0) {
      alert('Nenhum produto cadastrado para exportar.');
      return;
    }

    // CSV Headers
    const headers = [
      'Código',
      'Nome',
      'Categoria',
      'Preço (R$)',
      'Preço Promocional (R$)',
      'Disponível',
      'Material',
      'Acabamento',
      'Tamanho/Medida',
      'Instruções de Cuidado',
      'Data de Criação',
      'Descrição'
    ];

    // CSV Rows
    const rows = products.map(p => [
      p.code || '',
      p.name || '',
      p.category || '',
      p.price.toFixed(2),
      p.promoPrice !== undefined ? p.promoPrice.toFixed(2) : '',
      p.isAvailable ? 'Sim' : 'Não',
      p.material || '',
      p.finish || '',
      p.size || '',
      p.careInstructions || '',
      p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '',
      p.description || ''
    ]);

    // Format as CSV content with semicolon separator for Brazilian Excel compatibility
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => 
        row.map(val => {
          const escaped = String(val).replace(/"/g, '""');
          if (escaped.includes(';') || escaped.includes('\n') || escaped.includes('"') || escaped.includes(',')) {
            return `"${escaped}"`;
          }
          return escaped;
        }).join(';')
      )
    ].join('\r\n');

    // Add UTF-8 BOM for Excel to open accents properly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `catalogo_semijoias_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenQuickSale = (product: Product) => {
    setQuickSaleProduct(product);
    setIsQuickSaleOpen(true);
  };

  return (
    <div id="catalog-tab-container" className="space-y-6 pb-24">
      
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4.5 h-4.5" />
          <input
            id="catalog-search"
            type="text"
            placeholder="Buscar semijoia por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-brand-olive focus:ring-1 focus:ring-brand-olive transition-all outline-none text-neutral-800"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <button
            id="btn-share-catalog"
            onClick={() => setIsShareModalOpen(true)}
            className="flex-1 md:flex-none border border-brand-stone/40 bg-brand-stone/10 hover:bg-brand-stone/20 text-neutral-800 font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Share2 className="w-4 h-4 text-neutral-600" />
            Enviar Catálogo
          </button>

          <button
            id="btn-export-catalog"
            onClick={handleExportProducts}
            className="flex-1 md:flex-none border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 text-amber-900 font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-amber-700" />
            Exportar
          </button>

          <button
            id="btn-add-product"
            onClick={handleOpenAddProduct}
            className="flex-1 md:flex-none bg-brand-olive hover:bg-brand-stone active:scale-98 text-white font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Cadastrar Semijoia
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Categories */}
      <div id="categories-scroll" className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((cat) => (
          <button
            id={`cat-chip-${cat}`}
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-brand-olive text-white border-brand-olive shadow-xs'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-brand-stone hover:bg-brand-porcelain/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-150 p-12 text-center max-w-md mx-auto">
          <Tag className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-serif font-bold text-neutral-800">Nenhuma semijoia encontrada</h3>
          <p className="text-neutral-500 text-sm mt-1.5">
            Cadastre novos produtos no catálogo ou ajuste os filtros de busca para encontrar o que precisa.
          </p>
          <button
            onClick={handleOpenAddProduct}
            className="mt-5 inline-flex items-center gap-1.5 text-amber-600 font-semibold text-sm hover:text-amber-700 underline"
          >
            Adicionar Primeiro Produto
          </button>
        </div>
      ) : (
        <div id="products-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => (
            <div
              id={`product-card-${p.id}`}
              key={p.id}
              className={`bg-white rounded-2xl overflow-hidden border border-brand-parchment shadow-xs hover:shadow-md transition-all flex flex-col group ${
                !p.isAvailable ? 'opacity-70 grayscale-30' : ''
              }`}
            >
              {/* Product Image & Badge */}
              <div className="relative h-52 bg-neutral-100 overflow-hidden shrink-0">
                <img
                  id={`product-image-${p.id}`}
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {/* Category tag */}
                <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-neutral-800 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border border-brand-stone/30 shadow-xs">
                  {p.category}
                </span>

                {/* Available Status Badge */}
                <button
                  onClick={() => handleToggleAvailability(p)}
                  className={`absolute top-3 right-3 flex items-center gap-1 py-1 px-2.5 rounded-full text-[10px] font-bold shadow-xs transition-all border cursor-pointer ${
                    p.isAvailable
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                  title={p.isAvailable ? 'Clique para marcar como indisponível' : 'Clique para marcar como disponível'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${p.isAvailable ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {p.isAvailable ? 'Disponível' : 'Indisponível'}
                </button>
              </div>

              {/* Product Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <h4 className="font-serif font-bold text-neutral-800 text-base leading-tight group-hover:text-[#C4708A] transition-colors whitespace-normal break-words">
                      {p.name}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-block bg-[#F9E0E8] text-[#8B3A55] font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#E8D5DC]">
                      CÓD: {p.code || `SJ-${p.id.replace('prod_', '').substring(0, 4).toUpperCase()}`}
                    </span>
                    {p.estoque === 0 ? (
                      <span className="inline-block bg-red-50 text-red-700 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-200">
                        Esgotado
                      </span>
                    ) : p.estoque !== undefined && p.estoque !== null && p.estoque >= 1 && p.estoque <= 3 ? (
                      <span className="inline-block bg-amber-50 text-amber-700 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                        Estoque Baixo: {p.estoque} unidades
                      </span>
                    ) : p.estoque !== undefined && p.estoque !== null && p.estoque > 3 ? (
                      <span className="inline-block bg-emerald-50 text-emerald-700 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                        Em estoque: {p.estoque} unidades
                      </span>
                    ) : (
                      <span className="inline-block bg-neutral-100 text-neutral-500 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-neutral-250">
                        ILIMITADO
                      </span>
                    )}
                  </div>
                  
                  <p className="text-neutral-500 text-xs line-clamp-2 min-h-8">
                    {p.description || 'Sem descrição cadastrada.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 block uppercase tracking-wider font-semibold">Preço</span>
                    <span className="text-lg font-bold text-neutral-900">
                      R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      id={`btn-edit-${p.id}`}
                      onClick={() => handleOpenEditProduct(p)}
                      className="p-2 text-neutral-500 hover:text-brand-olive hover:bg-brand-porcelain/60 rounded-lg transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`btn-delete-${p.id}`}
                      onClick={() => setProductToDelete(p)}
                      className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {p.isAvailable ? (
                      <button
                        id={`btn-quicksell-${p.id}`}
                        onClick={() => handleOpenQuickSale(p)}
                        className="bg-brand-olive hover:bg-brand-stone active:scale-95 text-white p-2 rounded-xl flex items-center gap-1 font-semibold text-xs shadow-xs transition-all cursor-pointer animate-pulse-once"
                        title="Venda Rápida"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Vender</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-1 rounded-md">
                        Indisponível
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE/EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif font-bold text-xl text-neutral-800 flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-100" />
              {editingProduct ? 'Editar Semijoia' : 'Cadastrar Nova Semijoia'}
            </h3>

            <form onSubmit={handleSaveProductSubmit} className="space-y-4">
              {/* Product Code representation */}
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-150 flex justify-between items-center text-xs">
                <span className="font-semibold text-neutral-600">Código da Peça:</span>
                <span className="font-mono font-bold text-amber-750 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                  {editingProduct 
                    ? (editingProduct.code || `SJ-${editingProduct.id.replace('prod_', '').substring(0, 4).toUpperCase()}`)
                    : 'Gerado automaticamente'}
                </span>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Nome do Produto *</label>
                <input
                  id="modal-prod-name"
                  type="text"
                  required
                  placeholder="Ex: Anel Solitário de Prata 925"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800"
                />
              </div>

              {/* Category & Price Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Categoria *</label>
                  <select
                    id="modal-prod-category"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800"
                  >
                    {brandConfig.categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Preço (R$) *</label>
                  <input
                    id="modal-prod-price"
                    type="text"
                    required
                    placeholder="Ex: 129,90"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Descrição</label>
                <textarea
                  id="modal-prod-desc"
                  rows={3}
                  placeholder="Detalhes, material (ouro, prata, ródio), tamanho, propriedades antialérgicas..."
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800"
                />
              </div>

              {/* Image selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Imagem do Produto</label>
                
                {/* Tabs to select image type */}
                <div className="flex border-b border-neutral-200 mb-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setImageTab('upload')}
                    className={`pb-2 px-3 font-semibold border-b-2 transition-all ${
                      imageTab === 'upload'
                        ? 'border-amber-500 text-amber-600'
                        : 'border-transparent text-neutral-400'
                    }`}
                  >
                    Enviar do Dispositivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageTab('preset')}
                    className={`pb-2 px-3 font-semibold border-b-2 transition-all ${
                      imageTab === 'preset'
                        ? 'border-amber-500 text-amber-600'
                        : 'border-transparent text-neutral-400'
                    }`}
                  >
                    Fotos de Demonstração
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageTab('custom')}
                    className={`pb-2 px-3 font-semibold border-b-2 transition-all ${
                      imageTab === 'custom'
                        ? 'border-amber-500 text-amber-600'
                        : 'border-transparent text-neutral-400'
                    }`}
                  >
                    URL Personalizada
                  </button>
                </div>

                {imageTab === 'upload' && (
                  <div className="space-y-3">
                    {/* Drag and Drop Area */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDragLeave={(e) => e.preventDefault()}
                      onDrop={(e) => handleFileUpload(e, true)}
                      onClick={() => document.getElementById('device-image-upload')?.click()}
                      className="border-2 border-dashed border-neutral-200 hover:border-amber-500 hover:bg-amber-50/10 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                    >
                      <input
                        id="device-image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, false)}
                      />
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-semibold text-neutral-500">Otimizando imagem...</span>
                        </div>
                      ) : (
                        <>
                          <div className="p-2.5 bg-neutral-50 rounded-xl group-hover:bg-amber-100/50 group-hover:text-amber-600 text-neutral-400 transition-colors">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-xs">
                            <span className="font-bold text-neutral-700 block mb-0.5">Faça upload de fotos</span>
                            <span className="text-[10px] text-neutral-400 block">Clique para selecionar ou arraste aqui</span>
                            <span className="text-[9px] text-neutral-400 font-mono block mt-1">(Aceita múltiplas de uma vez)</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Previews Grid with Actions */}
                    {uploadedImages.length > 0 && (
                      <div className="space-y-2">
                        <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          Imagens Cadastradas ({uploadedImages.length})
                        </span>
                        <div className="grid grid-cols-4 gap-2">
                          {uploadedImages.map((img, idx) => {
                            const isMain = prodImageUrl === img;
                            return (
                              <div
                                key={idx}
                                className={`relative group/item rounded-xl aspect-square overflow-hidden border-2 transition-all ${
                                  isMain ? 'border-amber-500 ring-2 ring-amber-150 animate-pulse-once' : 'border-neutral-200 hover:border-neutral-350'
                                }`}
                              >
                                <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                
                                {/* Hover overlay with actions */}
                                <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 group-hover/item:opacity-100 transition-all flex items-center justify-center gap-1.5">
                                  {/* Delete button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveImage(img);
                                    }}
                                    className="p-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                                    title="Excluir Imagem"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Main Star selection */}
                                  {!isMain && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetMainImage(img);
                                      }}
                                      className="p-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors cursor-pointer"
                                      title="Definir como Principal"
                                    >
                                      <Star className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {/* Main indicator badge */}
                                {isMain && (
                                  <span className="absolute bottom-1 left-1 right-1 bg-amber-500 text-white text-[8px] font-bold text-center uppercase py-0.5 rounded shadow-xs">
                                    Principal
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <span className="block text-[9px] text-neutral-400">
                          * Clique no ícone <Star className="inline w-2.5 h-2.5 text-amber-500 fill-amber-500" /> para escolher a foto principal exibida no catálogo.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {imageTab === 'preset' && (
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-1 bg-neutral-50 rounded-xl border border-neutral-100">
                    {IMAGE_PRESETS.map((p, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setProdImageUrl(p.url)}
                        className={`relative rounded-lg overflow-hidden h-14 border-2 transition-all cursor-pointer ${
                          prodImageUrl === p.url ? 'border-amber-500 scale-95 shadow-sm' : 'border-transparent'
                        }`}
                      >
                        <img src={p.url} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/20 hover:bg-transparent transition-all flex items-end p-1">
                          <span className="text-[8px] font-bold text-white leading-tight truncate w-full">{p.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {imageTab === 'custom' && (
                  <div>
                    <input
                      id="modal-prod-img-url"
                      type="url"
                      placeholder="Cole a URL de uma imagem da internet (ex: do Unsplash, Imgur, etc.)"
                      value={prodImageUrl}
                      onChange={(e) => setProdImageUrl(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800"
                    />
                  </div>
                )}
                
                {/* Image Preview (for preset and custom tab, as upload tab already has its grid) */}
                {imageTab !== 'upload' && prodImageUrl && (
                  <div className="mt-3 flex items-center space-x-3 bg-amber-50/45 p-2 rounded-xl border border-amber-100/50">
                    <img
                      src={prodImageUrl}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-amber-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=100&q=80';
                      }}
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-[10px] text-neutral-500">
                      <span className="font-semibold text-neutral-600 block">Preview da Imagem Principal</span>
                      A imagem será exibida nos cards e catálogo.
                    </div>
                  </div>
                )}
              </div>

              {/* Estoque Control */}
              <div className="grid grid-cols-1 gap-1.5 py-2.5 border-t border-neutral-100">
                <label className="block text-xs font-semibold text-neutral-600">Quantidade em Estoque</label>
                <input
                  id="modal-prod-estoque"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Ex: 10 (Deixe vazio para estoque ilimitado)"
                  value={prodEstoque}
                  onChange={(e) => setProdEstoque(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm focus:border-[#C4708A] focus:bg-white focus:ring-1 focus:ring-[#C4708A] transition-all outline-none text-neutral-800"
                />
                <span className="text-[10px] text-neutral-400 font-medium">Deixe vazio para controle desativado (estoque ilimitado).</span>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between py-2 border-t border-neutral-100">
                <div>
                  <span className="text-xs font-semibold text-neutral-700 block">Disponível para venda imediata</span>
                  <span className="text-[11px] text-neutral-400">Ative para exibir a opção "Vender" no catálogo</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProdIsAvailable(!prodIsAvailable)}
                  className="text-amber-600 focus:outline-none cursor-pointer"
                >
                  {prodIsAvailable ? (
                    <ToggleRight className="w-10 h-10 text-amber-600" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-neutral-350" />
                  )}
                </button>
              </div>

              {/* Advanced Catalog Fields Toggle */}
              <div className="border-t border-b border-neutral-100 py-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                  className="w-full flex items-center justify-between py-1 px-2 hover:bg-neutral-50 rounded-lg text-xs font-bold text-neutral-700 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <Sparkles className="w-4 h-4 fill-amber-50" />
                    Opções Avançadas do Catálogo (Ficha Técnica, Fotos, Badges)
                  </span>
                  {showAdvancedFields ? (
                    <ChevronUp className="w-4 h-4 text-neutral-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                  )}
                </button>

                {showAdvancedFields && (
                  <div className="mt-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-3.5 animate-fade-in">
                    
                    {/* Highlight Badges */}
                    <div>
                      <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Selos de Destaque no Catálogo</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setProdIsNew(!prodIsNew)}
                          className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            prodIsNew 
                              ? 'bg-amber-100 border-amber-300 text-amber-800' 
                              : 'bg-white border-neutral-250 text-neutral-600'
                          }`}
                        >
                          <span>✨ Novidade</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProdIsFeatured(!prodIsFeatured)}
                          className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            prodIsFeatured 
                              ? 'bg-purple-100 border-purple-300 text-purple-800' 
                              : 'bg-white border-neutral-250 text-neutral-600'
                          }`}
                        >
                          <span>🔥 Destaque</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProdIsPromo(!prodIsPromo)}
                          className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            prodIsPromo 
                              ? 'bg-rose-100 border-rose-300 text-rose-800' 
                              : 'bg-white border-neutral-250 text-neutral-600'
                          }`}
                        >
                          <span>🏷️ Promoção</span>
                        </button>
                      </div>
                    </div>

                    {/* Promo Price Field (Only if Promo checked) */}
                    {prodIsPromo && (
                      <div className="animate-slide-up">
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Preço Promocional (R$) *</label>
                        <input
                          type="text"
                          placeholder="Ex: 99,90 (deve ser menor que o preço original)"
                          value={prodPromoPrice}
                          onChange={(e) => setProdPromoPrice(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-800"
                        />
                      </div>
                    )}

                    {/* Specifications Row 1 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Material</label>
                        <input
                          type="text"
                          placeholder="Ex: Prata 925 / Ouro 18k"
                          value={prodMaterial}
                          onChange={(e) => setProdMaterial(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Acabamento</label>
                        <input
                          type="text"
                          placeholder="Ex: Polido / Cravejado"
                          value={prodFinish}
                          onChange={(e) => setProdFinish(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-800"
                        />
                      </div>
                    </div>

                    {/* Specifications Row 2 */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Tamanho / Dimensões</label>
                      <input
                        type="text"
                        placeholder="Ex: Corrente 45cm / Anel regulável / Diâmetro 2cm"
                        value={prodSize}
                        onChange={(e) => setProdSize(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-800"
                      />
                    </div>

                    {/* Care Instructions */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Dicas de Cuidado / Conservação</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Evitar contato com cremes, sabonete, mar e piscina para maior durabilidade."
                        value={prodCareInstructions}
                        onChange={(e) => setProdCareInstructions(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-800"
                      />
                    </div>

                    {/* Gallery Extra Images */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Fotos Extras para Galeria (URLs)</label>
                      <textarea
                        rows={2}
                        placeholder="Cole links de fotos adicionais da peça, separando-os por vírgulas"
                        value={prodGalleryText}
                        onChange={(e) => setProdGalleryText(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-800 font-mono"
                      />
                      <span className="text-[9px] text-neutral-450 block mt-1">Ex: https://link1.com, https://link2.com</span>
                    </div>

                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-700 font-semibold text-sm py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-semibold text-sm py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Salvar Semijoia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK SALE MODAL */}
      {isQuickSaleOpen && quickSaleProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsQuickSaleOpen(false);
                setQuickSaleProduct(null);
                setShowNewCustomerForm(false);
              }}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif font-bold text-xl text-neutral-800 flex items-center gap-2 mb-3">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              Venda Rápida
            </h3>

            {/* Product Quick Details */}
            <div className="flex items-center space-x-3 bg-amber-50/40 p-3 rounded-2xl border border-amber-100 mb-4">
              <img
                src={quickSaleProduct.imageUrl}
                alt={quickSaleProduct.name}
                className="w-12 h-12 rounded-xl object-cover border border-amber-200"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-serif font-bold text-neutral-800 truncate">{quickSaleProduct.name}</h4>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-neutral-500">{quickSaleProduct.category}</span>
                  <span className="text-sm font-bold text-amber-700">
                    R$ {quickSaleProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleQuickSaleSubmit} className="space-y-4">
              
              {/* Customer Selector */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-neutral-600">Cliente da Venda *</label>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                  >
                    {showNewCustomerForm ? 'Selecionar Cadastrado' : '+ Cadastrar Novo'}
                  </button>
                </div>

                {showNewCustomerForm ? (
                  <div className="space-y-2.5 p-3 bg-neutral-50 border border-neutral-200 rounded-2xl">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase block">Novo Cliente</span>
                    <div>
                      <input
                        id="new-cust-name"
                        type="text"
                        required
                        placeholder="Nome completo do cliente *"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-850"
                      />
                    </div>
                    <div>
                      <input
                        id="new-cust-phone"
                        type="tel"
                        placeholder="Telefone / WhatsApp (opcional)"
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 outline-none text-neutral-850"
                      />
                    </div>
                  </div>
                ) : (
                  <select
                    id="quicksell-customer"
                    value={saleCustomerId}
                    onChange={(e) => setSaleCustomerId(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800"
                  >
                    <option value="balcao">Venda Balcão (Avulso / Sem cadastro)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? ` - ${c.phone}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity & Payment Method Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Quantidade</label>
                  <input
                    id="quicksell-qty"
                    type="number"
                    min={1}
                    required
                    value={saleQuantity}
                    onChange={(e) => setSaleQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Forma de Pagamento</label>
                  <select
                    id="quicksell-payment"
                    value={salePaymentMethod}
                    onChange={(e) => setSalePaymentMethod(e.target.value as 'cash' | 'credit')}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800"
                  >
                    <option value="cash">À Vista (Pago)</option>
                    <option value="credit">Fiado (Pendente)</option>
                  </select>
                </div>
              </div>

              {/* Validation Warning for Fiado without registered customer */}
              {salePaymentMethod === 'credit' && saleCustomerId === 'balcao' && !showNewCustomerForm && (
                <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-200 text-[11px] leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Importante:</strong> Vendas no fiado exigem um cliente cadastrado. Clique em <strong>+ Cadastrar Novo</strong> para adicionar o cliente agora.
                  </span>
                </div>
              )}

              {/* Total Summary */}
              <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-150 flex items-center justify-between text-sm">
                <span className="font-semibold text-neutral-600">Total Geral:</span>
                <span className="text-base font-bold text-neutral-900">
                  R$ {(quickSaleProduct.price * saleQuantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickSaleOpen(false);
                    setQuickSaleProduct(null);
                    setShowNewCustomerForm(false);
                  }}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-700 font-semibold text-sm py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salePaymentMethod === 'credit' && saleCustomerId === 'balcao' && !showNewCustomerForm}
                  className={`flex-1 font-semibold text-sm py-2.5 rounded-xl shadow-xs transition-all cursor-pointer text-white ${
                    salePaymentMethod === 'credit' && saleCustomerId === 'balcao' && !showNewCustomerForm
                      ? 'bg-neutral-300 cursor-not-allowed opacity-50'
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

      {/* SHARE CATALOG MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-100 relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-neutral-800">Enviar Catálogo para Clientes</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Compartilhe o catálogo com facilidade</p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto py-5 space-y-6 flex-1 pr-1 -mr-1">
              
              {/* WhatsApp Warning */}
              {!brandConfig.whatsAppNumber && (
                <div className="bg-amber-50/70 border border-amber-200 text-amber-800 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <strong className="font-semibold block mb-0.5">Sem telefone de recebimento cadastrado</strong>
                    Seus clientes não conseguirão te enviar a sacola de compras de forma automatizada pelo WhatsApp. Cadastre seu número nas <strong>Configurações da Loja</strong>.
                  </div>
                </div>
              )}

              {/* Option 1: Public Interactive Catalog */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Opção 1: Catálogo Online Interativo</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  A cliente abre uma página linda com fotos, preços e categorias. Ela monta uma sacola de compras e te envia o pedido pronto diretamente no seu WhatsApp!
                </p>
                
                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-150 space-y-3">
                  <div className="bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-600 font-mono select-all overflow-x-auto whitespace-nowrap scrollbar-none">
                    {getPublicOrigin()}?catalog=true
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const success = await safeCopyToClipboard(`${getPublicOrigin()}?catalog=true`);
                        if (success) {
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }
                      }}
                      className="flex-1 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs py-2.5 px-3 rounded-xl border border-neutral-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">Link Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Link do Catálogo</span>
                        </>
                      )}
                    </button>
                    
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Oi! Veja nosso catálogo de semijoias novidades e faça seu pedido direto na sacola interativa: 💖\n\n${getPublicOrigin()}?catalog=true`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Send className="w-4 h-4" />
                      <span>Enviar no WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Option 2: Formatted Text Catalog */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Opção 2: Lista Completa em Texto</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Gere um resumo formatado para enviar no WhatsApp ou colar em redes sociais, com todos os produtos disponíveis no momento.
                </p>
                
                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-150 space-y-3">
                  <div className="bg-white border border-neutral-200 rounded-xl p-3 text-[11px] text-neutral-600 font-mono h-32 overflow-y-auto whitespace-pre-wrap select-all">
                    {textCatalogMessage}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      disabled={products.filter(p => p.isAvailable).length === 0}
                      onClick={async () => {
                        const success = await safeCopyToClipboard(textCatalogMessage);
                        if (success) {
                          setCopiedText(true);
                          setTimeout(() => setCopiedText(false), 2000);
                        }
                      }}
                      className="flex-1 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs py-2.5 px-3 rounded-xl border border-neutral-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">Lista Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Lista de Texto</span>
                        </>
                      )}
                    </button>
                    
                    <a
                      href={products.filter(p => p.isAvailable).length === 0 ? undefined : `https://api.whatsapp.com/send?text=${encodeURIComponent(textCatalogMessage)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${products.filter(p => p.isAvailable).length === 0 ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <Send className="w-4 h-4" />
                      <span>Enviar Lista WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-100 pt-3 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="bg-neutral-800 hover:bg-neutral-900 active:scale-98 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      <ConfirmModal
        isOpen={productToDelete !== null}
        title="Excluir Semijoia"
        message={
          <span>
            Tem certeza de que deseja excluir permanentemente o produto <strong>"{productToDelete?.name}"</strong> do seu catálogo? Esta ação não pode ser desfeita.
          </span>
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={async () => {
          if (productToDelete) {
            await onDeleteProduct(productToDelete.id);
            setProductToDelete(null);
          }
        }}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}
