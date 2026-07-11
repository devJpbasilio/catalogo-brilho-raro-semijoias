/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrandConfig } from '../types';
import {
  Settings, Sparkles, Image as ImageIcon, Database, Save,
  Trash2, Plus, AlertTriangle, RefreshCw, Check, Cloud, Smartphone,
  Star
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { compressAndResizeImage } from '../lib/image-utils';
import { uploadImage } from '../lib/storage';

interface SettingsTabProps {
  brandConfig: BrandConfig;
  storageMode: 'cloud' | 'local';
  cloudAvailable: boolean;
  onSaveConfig: (config: BrandConfig) => Promise<void>;
  onSeedData: () => Promise<void>;
  onToggleStorageMode: (mode: 'cloud' | 'local') => void;
}

// Unsplash banner presets for quick covers
const BANNER_PRESETS = [
  { name: 'Ouro Imperial', url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Brilho Lapidado', url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Prata Minimalista', url: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Pérolas Clássicas', url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1200&auto=format&fit=crop&q=80' }
];

// Unsplash logo presets
const LOGO_PRESETS = [
  { name: 'Joia Dourada', url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=150&auto=format&fit=crop&q=80' },
  { name: 'Pérola Escura', url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=150&auto=format&fit=crop&q=80' },
  { name: 'Cristal Azul', url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=150&auto=format&fit=crop&q=80' }
];

export default function SettingsTab({
  brandConfig,
  storageMode,
  cloudAvailable,
  onSaveConfig,
  onSeedData,
  onToggleStorageMode
}: SettingsTabProps) {
  const [brandName, setBrandName] = useState(brandConfig.brandName);
  const [logoUrl, setLogoUrl] = useState(brandConfig.logoUrl);
  const [bannerUrl, setBannerUrl] = useState(brandConfig.bannerUrl);
  const [whatsAppNumber, setWhatsAppNumber] = useState(brandConfig.whatsAppNumber || '');
  const [categories, setCategories] = useState<string[]>(brandConfig.categories || []);
  const [newCategory, setNewCategory] = useState('');
  const [slogan, setSlogan] = useState(brandConfig.slogan || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

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

  // Add new category
  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      alert('Esta categoria já existe!');
      return;
    }
    setCategories([...categories, trimmed]);
    setNewCategory('');
  };

  // Remove category
  const handleRemoveCategory = (catToRemove: string) => {
    if (categories.length <= 1) {
      alert('É necessário manter pelo menos 1 categoria no catálogo.');
      return;
    }
    setConfirmConfig({
      isOpen: true,
      title: 'Remover Categoria',
      message: (
        <span>
          Deseja realmente remover a categoria <strong>"{catToRemove}"</strong>? Isso apenas removerá do seletor, sem excluir os produtos existentes.
        </span>
      ),
      confirmText: 'Remover',
      isDanger: true,
      onConfirm: () => {
        setCategories(categories.filter(c => c !== catToRemove));
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Save Config
  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      alert('O nome da marca é obrigatório.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await onSaveConfig({
        brandName: brandName.trim(),
        logoUrl,
        bannerUrl,
        categories,
        whatsAppNumber: whatsAppNumber.trim(),
        slogan: slogan.trim()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load demo seed data
  const handleLoadDemoData = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Carregar Dados de Demonstração',
      message: (
        <span>
          <strong>Atenção:</strong> Carregar dados de demonstração irá substituir os produtos, clientes e vendas locais atuais por um lindo catálogo de testes com relatórios financeiros de simulação. Deseja continuar?
        </span>
      ),
      confirmText: 'Confirmar Substituição',
      isDanger: true,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setIsSeeding(true);
        try {
          await onSeedData();
          alert('Catálogo e vendas de demonstração carregados com sucesso! O aplicativo será atualizado.');
          window.location.reload();
        } catch (e) {
          console.error(e);
          alert('Erro ao carregar os dados de demonstração.');
        } finally {
          setIsSeeding(false);
        }
      }
    });
  };

  return (
    <div id="settings-tab-container" className="space-y-6 pb-24 max-w-2xl mx-auto">
      
      {/* Settings Form */}
      <form onSubmit={handleSaveAll} className="space-y-6">
        
        {/* BRAND IDENTITY CARD CONFIG */}
        <div className="bg-white rounded-2xl border border-amber-50 p-5 shadow-sm space-y-4">
          <h3 className="font-serif font-bold text-lg text-neutral-800 flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-100" />
            Identidade Visual & Marca
          </h3>

          <div className="space-y-4">
            {/* Brand Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Nome da Marca / Loja *</label>
              <input
                id="setting-brand-name"
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ex: Brilho Raro Semijoias"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800 font-medium"
              />
            </div>

            {/* Slogan / Tagline */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Frase de Boas-vindas / Slogan da Capa</label>
              <input
                id="setting-slogan"
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder="Ex: As semijoias mais exclusivas selecionadas para você brilhar"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800 font-medium"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Uma breve frase de impacto que aparece logo abaixo do nome da marca na capa do catálogo.</p>
            </div>

            {/* WhatsApp Store Number */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">WhatsApp para Receber Pedidos (com DDD)</label>
              <input
                id="setting-whatsapp"
                type="text"
                value={whatsAppNumber}
                onChange={(e) => setWhatsAppNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 11999999999"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all outline-none text-neutral-800 font-medium"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Apenas números, com o DDD (Ex: 11999999999). Seus clientes enviarão a sacola de compras diretamente para este número.</p>
            </div>

            {/* Custom Logo URL / File upload */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Logo da Loja</label>
              <div className="space-y-2">
                <input
                  id="setting-logo-url"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Cole a URL de uma imagem quadrada de logo"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 focus:bg-white outline-none text-neutral-800 text-xs font-medium"
                />
                
                <div className="flex items-center gap-3">
                  <label className="flex-1 bg-neutral-150 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 rounded-xl px-4 py-2 text-xs font-bold text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5 min-h-[36px]">
                    <ImageIcon className="w-4 h-4 text-[#C4708A]" />
                    <span>Upload Logo do Dispositivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressAndResizeImage(file, 200, 0.7);
                            setLogoUrl(await uploadImage(compressed, 'brand'));
                          } catch (err: any) {
                            alert(err.message || 'Erro ao processar imagem.');
                          }
                        }
                      }}
                    />
                  </label>
                  {(logoUrl.startsWith('data:image/') || logoUrl.includes('/storage/v1/object/public/')) && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="bg-red-55 hover:bg-red-100 text-red-650 border border-red-200 p-2 rounded-xl text-xs font-bold transition-all h-[36px] w-[36px] flex items-center justify-center cursor-pointer"
                      title="Remover imagem enviada"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Presets logo chips */}
              <div className="flex items-center space-x-2 mt-2 flex-wrap gap-1.5">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase">Presets:</span>
                {LOGO_PRESETS.map((logo, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setLogoUrl(logo.url)}
                    className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-all cursor-pointer font-bold min-h-[28px] flex items-center"
                  >
                    {logo.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Banner URL / File upload */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Capa / Banner do Catálogo</label>
              <div className="space-y-2">
                <input
                  id="setting-banner-url"
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="Cole a URL de uma imagem horizontal de capa"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 focus:bg-white outline-none text-neutral-800 text-xs font-medium"
                />

                <div className="flex items-center gap-3">
                  <label className="flex-1 bg-neutral-150 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 rounded-xl px-4 py-2 text-xs font-bold text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5 min-h-[36px]">
                    <ImageIcon className="w-4 h-4 text-[#C4708A]" />
                    <span>Upload Capa do Dispositivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressAndResizeImage(file, 800, 0.6);
                            setBannerUrl(await uploadImage(compressed, 'brand'));
                          } catch (err: any) {
                            alert(err.message || 'Erro ao processar imagem.');
                          }
                        }
                      }}
                    />
                  </label>
                  {(bannerUrl.startsWith('data:image/') || bannerUrl.includes('/storage/v1/object/public/')) && (
                    <button
                      type="button"
                      onClick={() => setBannerUrl('')}
                      className="bg-red-55 hover:bg-red-100 text-red-650 border border-red-200 p-2 rounded-xl text-xs font-bold transition-all h-[36px] w-[36px] flex items-center justify-center cursor-pointer"
                      title="Remover imagem enviada"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Presets cover chips */}
              <div className="flex items-center space-x-2 mt-2 flex-wrap gap-1.5">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase">Banners Preset:</span>
                {BANNER_PRESETS.map((banner, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setBannerUrl(banner.url)}
                    className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-all cursor-pointer font-bold min-h-[28px] flex items-center"
                  >
                    {banner.name}
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE PREVIEW CARD */}
            <div className="border border-neutral-150 rounded-2xl overflow-hidden mt-4 shadow-sm bg-neutral-50/50">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-neutral-500 bg-neutral-100/80 px-3.5 py-2 border-b border-neutral-150">
                Visualização ao Vivo da Capa do Catálogo
              </span>
              <div className="relative h-36 bg-neutral-900 overflow-hidden">
                <img 
                  src={bannerUrl || "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&auto=format&fit=crop&q=80"}
                  alt="Prévia Banner" 
                  className="w-full h-full object-cover opacity-50"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/35 to-transparent" />
                
                <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <img 
                      src={logoUrl || "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=100&q=80"} 
                      alt="Prévia Logo" 
                      className="w-12 h-12 rounded-full border border-white/90 shadow-sm object-cover bg-white"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 border border-white shadow-md">
                      <Star className="w-2 h-2 fill-white text-white" />
                    </span>
                  </div>
                  <div className="text-white min-w-0">
                    <span className="text-[8px] uppercase font-extrabold tracking-widest text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded-full border border-amber-500/20">Catálogo Interativo</span>
                    <h4 className="text-sm font-serif font-bold truncate leading-tight mt-0.5">{brandName || "Minha Marca"}</h4>
                    <p className="text-[9px] text-neutral-200 line-clamp-1 leading-normal italic mt-0.5">
                      {slogan || "As semijoias mais exclusivas selecionadas para você brilhar..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CATALOG CATEGORIES MANAGER */}
        <div className="bg-white rounded-2xl border border-amber-50 p-5 shadow-sm space-y-4">
          <h3 className="font-serif font-bold text-lg text-neutral-800 flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Settings className="w-5 h-5 text-amber-600" />
            Gerenciar Categorias de Semijoias
          </h3>
          
          <p className="text-xs text-neutral-500 leading-relaxed">
            Crie categorias personalizadas para organizar o seu catálogo (ex: Piercings, Alianças, Prata 925).
          </p>

          <div className="space-y-4">
            {/* Add new category */}
            <div className="flex space-x-2">
              <input
                id="setting-new-category"
                type="text"
                placeholder="Nova Categoria (Ex: Choker, Correntes)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm focus:border-amber-500 focus:bg-white outline-none text-neutral-800 font-medium"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="bg-neutral-800 hover:bg-neutral-900 active:scale-95 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            {/* List active categories */}
            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
                >
                  {cat}
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(cat)}
                    className="text-neutral-400 hover:text-red-500 font-bold transition-colors focus:outline-none cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* PERSISTENT DATABASE AND STORAGE SETTINGS */}
        <div className="bg-white rounded-2xl border border-amber-50 p-5 shadow-sm space-y-4">
          <h3 className="font-serif font-bold text-lg text-neutral-800 flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Database className="w-5 h-5 text-amber-600" />
            Armazenamento & Sincronização
          </h3>

          <div className="space-y-3">
            {/* Status indicators */}
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-150">
              <div className="space-y-0.5">
                <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider">Serviço de Nuvem</span>
                <span className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
                  <Cloud className={`w-4 h-4 ${cloudAvailable ? 'text-emerald-500' : 'text-neutral-300'}`} />
                  Supabase {cloudAvailable ? 'Conectado' : 'Não Configurado'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider">Ambiente Ativo</span>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                  storageMode === 'cloud' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                    : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${storageMode === 'cloud' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  {storageMode === 'cloud' ? 'Nuvem Supabase' : 'Local Offline'}
                </span>
              </div>
            </div>

            {/* Storage explanation */}
            <p className="text-[11px] text-neutral-500 leading-normal">
              O sistema salva automaticamente todos os lançamentos no navegador do celular (Offline). Se o <strong>Supabase</strong> estiver conectado, você pode ativar o <strong>Modo Nuvem</strong> para que seus produtos, clientes e vendas fiquem salvos de forma segura e permanente na nuvem.
            </p>

            {/* Storage toggles */}
            {cloudAvailable && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onToggleStorageMode('local')}
                  className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    storageMode === 'local'
                      ? 'bg-amber-50 border-amber-400 text-amber-800 font-extrabold shadow-xs'
                      : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Salvar Apenas Local
                </button>

                <button
                  type="button"
                  onClick={() => onToggleStorageMode('cloud')}
                  className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    storageMode === 'cloud'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-extrabold shadow-xs'
                      : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
                >
                  <Cloud className="w-4 h-4" />
                  Sincronizar na Nuvem
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ACCESS SECURITY INFO CARD */}
        <div className="bg-white rounded-2xl border border-amber-50 p-5 shadow-sm space-y-3">
          <h3 className="font-serif font-bold text-lg text-neutral-800 flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Star className="w-5 h-5 text-amber-600" />
            Segurança & Controle de Acesso
          </h3>

          <p className="text-xs text-neutral-500 leading-relaxed">
            O painel administrativo (cadastros de clientes, fluxo de caixa e relatórios) é protegido por
            <strong> login seguro individual</strong>. Suas credenciais ficam guardadas com criptografia no
            provedor de autenticação — nunca em texto puro no navegador ou no catálogo.
            <span className="text-amber-700 font-bold block mt-1">
              ⚠️ O catálogo público de fotos continua livre para suas clientes fazerem pedidos sem precisar de senha.
            </span>
          </p>

          <div className="bg-neutral-50 border border-neutral-150 rounded-xl p-3 text-[11px] text-neutral-500 leading-normal">
            Para alterar a senha de acesso ou cadastrar um novo administrador, use o painel de autenticação da
            sua conta na nuvem (Supabase Authentication). Assim, mesmo que alguém tenha o link do aplicativo,
            não conseguirá abrir o painel administrativo sem as credenciais corretas.
          </div>
        </div>

        {/* SUBMIT FORM ACTIONS */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-neutral-500 font-medium">
            {saveSuccess && (
              <span className="text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                Ajustes salvos com sucesso!
              </span>
            )}
          </div>

          <button
            id="btn-save-settings"
            type="submit"
            disabled={isSaving}
            className={`bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-semibold text-sm px-7 py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer min-w-36 ${
              isSaving ? 'opacity-50 cursor-wait' : ''
            }`}
          >
            <Save className="w-4.5 h-4.5" />
            {isSaving ? 'Salvando...' : 'Salvar Ajustes'}
          </button>
        </div>
      </form>

      {/* DANGEROUS ZONE: SEED DEMO DATA */}
      <div className="bg-red-50/40 border border-red-100 rounded-2xl p-5 shadow-sm space-y-4 mt-6">
        <h3 className="font-serif font-bold text-base text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Zona de Demonstração
        </h3>
        
        <p className="text-xs text-neutral-500 leading-normal">
          Deseja experimentar o aplicativo com dados prontos? Clique no botão abaixo para carregar um catálogo completo de semijoias finas (brincos, colares, anéis), clientes simulados de alta frequência e vendas de exemplo no fiado e à vista para ver o faturamento e fluxo de caixa funcionando instantaneamente.
        </p>

        <div>
          <button
            id="btn-seed-data"
            type="button"
            disabled={isSeeding}
            onClick={handleLoadDemoData}
            className={`bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
              isSeeding ? 'opacity-50 cursor-wait' : ''
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
            {isSeeding ? 'Carregando Demonstração...' : 'Limpar e Carregar Catálogo de Demonstração'}
          </button>
        </div>
      </div>
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
