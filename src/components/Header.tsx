/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrandConfig } from '../types';
import { Sparkles, MapPin, Phone, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  brandConfig: BrandConfig;
  isCompact: boolean;
  hasPassword?: boolean;
  onLogout?: () => void;
}

export default function Header({ brandConfig, isCompact, hasPassword, onLogout }: HeaderProps) {
  if (isCompact) {
    return (
      <header id="header-compact" className="sticky top-0 z-40 bg-brand-porcelain/95 backdrop-blur-md border-b border-brand-stone/45 px-4 py-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            id="brand-logo-compact"
            src={brandConfig.logoUrl || 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=80&auto=format&fit=crop&q=80'}
            alt="Logo"
            className="w-8 h-8 rounded-full object-cover border border-brand-stone/60 shadow-xs"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 id="brand-name-compact" className="font-serif font-bold text-lg text-neutral-800 tracking-tight flex items-center gap-1">
              {brandConfig.brandName}
              <Sparkles className="w-3.5 h-3.5 text-brand-olive fill-brand-porcelain" />
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasPassword && onLogout && (
            <button
              onClick={onLogout}
              className="md:hidden p-2 rounded-xl text-neutral-500 hover:text-red-600 active:bg-neutral-100 transition-all cursor-pointer"
              title="Sair do painel"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          )}
          <div className="bg-brand-olive text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs">
            Painel de Controle
          </div>
        </div>
      </header>
    );
  }

  return (
    <div id="header-full" className="relative bg-neutral-900 text-white">
      {/* Cover Banner */}
      <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
        <div className="absolute inset-0 bg-black/45 z-10" />
        <img
          id="brand-banner"
          src={brandConfig.bannerUrl || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&auto=format&fit=crop&q=80'}
          alt="Capa do Catálogo"
          className="w-full h-full object-cover transform scale-105"
          referrerPolicy="no-referrer"
        />
        
        {/* Subtle decorative elements */}
        <div className="absolute top-4 right-4 z-20 flex space-x-2">
          <span className="bg-white/10 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Catálogo Online
          </span>
        </div>
      </div>

      {/* Brand Identity Card overlay */}
      <div className="relative z-20 px-4 pb-4 -mt-10 sm:-mt-12">
        <div className="bg-white text-neutral-900 rounded-2xl p-4 sm:p-5 shadow-xl border border-brand-stone/40 max-w-lg mx-auto">
          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left sm:space-x-4">
            {/* Logo */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: 'spring' }}
              className="relative -mt-12 sm:-mt-14 mb-3 sm:mb-0"
            >
              <img
                id="brand-logo"
                src={brandConfig.logoUrl || 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=150&auto=format&fit=crop&q=80'}
                alt={brandConfig.brandName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg bg-white"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 right-0 bg-brand-olive text-white p-1.5 rounded-full border border-white shadow-md">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
              </div>
            </motion.div>

            {/* Name & Details */}
            <div className="flex-1">
              <h2 id="brand-name" className="font-serif font-bold text-2xl text-neutral-800 tracking-tight">
                {brandConfig.brandName}
              </h2>
              <p className="text-brand-rosewood text-sm font-medium mt-0.5 font-serif italic">
                Semijoias Finas & Alta Joalheria
              </p>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-y-1.5 gap-x-3 mt-3 text-xs text-neutral-500 border-t border-neutral-100 pt-2.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" /> Atendimento Personalizado
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" /> Pronta Entrega
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
