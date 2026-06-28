/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrandConfig } from '../types';
import { Lock, Eye, EyeOff, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminLoginProps {
  brandConfig: BrandConfig;
  onLoginSuccess: () => void;
}

export default function AdminLogin({ brandConfig, onLoginSuccess }: AdminLoginProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    
    if (!brandConfig.adminPassword) {
      onLoginSuccess();
      return;
    }

    setIsSubmitting(true);
    
    // Simulate brief elegant delay to prevent brute-forcing and make it look premium
    setTimeout(() => {
      setIsSubmitting(false);
      if (passwordInput.trim() === brandConfig.adminPassword) {
        // Store session authentication so they don't have to re-enter upon simple page refreshes
        sessionStorage.setItem('admin_authenticated', 'true');
        onLoginSuccess();
      } else {
        setError(true);
        setPasswordInput('');
      }
    }, 600);
  };

  return (
    <div id="admin-login-screen" className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative luxury gradient ambient background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-100/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-neutral-200/40 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-white border border-neutral-150 rounded-3xl shadow-xl p-8 relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          {/* Logo container */}
          {brandConfig.logoUrl ? (
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-200 shadow-md mb-4 flex items-center justify-center bg-amber-50">
              <img 
                src={brandConfig.logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4 relative shadow-inner">
              <Lock className="w-7 h-7 stroke-[1.5]" />
              <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
          )}

          <h2 className="font-serif font-bold text-2xl text-neutral-800 tracking-tight">
            {brandConfig.brandName}
          </h2>
          <p className="text-xs text-neutral-400 font-medium mt-1 uppercase tracking-wider">
            Painel Administrativo Protegido
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Senha de Acesso
            </label>
            <div className="relative">
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                disabled={isSubmitting}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Insira a senha de administração"
                className={`w-full bg-neutral-50 border rounded-2xl pl-4 pr-12 py-3.5 text-sm focus:bg-white transition-all outline-none text-neutral-800 font-mono tracking-widest font-bold text-center ${
                  error 
                    ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                    : 'border-neutral-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                }`}
              />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 text-xs text-red-600 font-semibold mt-1"
              >
                <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Senha incorreta. Tente novamente.</span>
              </motion.div>
            )}
          </div>

          <button
            id="btn-submit-login"
            type="submit"
            disabled={isSubmitting || !passwordInput}
            className="w-full bg-neutral-800 hover:bg-neutral-900 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md mt-6"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verificando...
              </span>
            ) : (
              <>
                <span>Entrar no Painel</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Footer hint that catalog is public */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 0.4 }}
        className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest mt-8 text-center max-w-xs leading-relaxed"
      >
        Apenas o painel de vendas é restrito. <br />
        Seu catálogo público de fotos continua acessível aos clientes.
      </motion.p>
    </div>
  );
}
