/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrandConfig } from '../types';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { signInAdmin, friendlyAuthError } from '../lib/auth';
import BrandLogo from './BrandLogo';

interface AdminLoginProps {
  brandConfig: BrandConfig;
}

export default function AdminLogin({ brandConfig }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage('');
    setShouldShake(false);
    setIsSubmitting(true);

    try {
      await signInAdmin(email, passwordInput);
      // O App reage automaticamente à mudança de estado de autenticação.
    } catch (err) {
      setErrorMessage(friendlyAuthError(err));
      setShouldShake(true);
      setPasswordInput('');
      setTimeout(() => setShouldShake(false), 400);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="admin-login-screen" className="admin-login-bg">
      <div className={`admin-login-card ${shouldShake ? 'shake' : ''}`}>
        <div className="flex flex-col items-center text-center mb-6">
          {/* Logo da Loja */}
          {brandConfig.logoUrl ? (
            <div className="w-20 h-20 rounded-full overflow-hidden border border-[#E8D5DC] shadow-sm mb-4 flex items-center justify-center bg-white">
              <img
                src={brandConfig.logoUrl}
                alt="Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="mb-4">
              <BrandLogo size={72} />
            </div>
          )}

          {/* Nome da Loja */}
          <h2 className="brand-wordmark text-3xl admin-login-text-primary">
            {brandConfig.brandName || 'Brilho Raro Semijoias'}
          </h2>
          <p className="text-[10px] font-semibold tracking-wider uppercase mt-1 admin-login-text-secondary">
            Painel Administrativo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* E-mail */}
          <div>
            <label className="admin-login-label" htmlFor="login-email-input">
              E-mail de Acesso
            </label>
            <input
              id="login-email-input"
              type="email"
              required
              autoFocus
              autoComplete="username"
              disabled={isSubmitting}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="voce@exemplo.com"
              className="admin-login-input"
            />
          </div>

          {/* Senha */}
          <div>
            <label className="admin-login-label" htmlFor="login-password-input">
              Senha
            </label>
            <div className="relative">
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                disabled={isSubmitting}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Digite a senha"
                className="admin-login-input"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6872] hover:text-[#2B1F28] focus:outline-none cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-1.5 text-[#9B2335] font-semibold mt-2">
                <AlertCircle className="w-4 h-4" />
                <span className="admin-login-text-error">{errorMessage}</span>
              </div>
            )}
          </div>

          <button
            id="btn-submit-login"
            type="submit"
            disabled={isSubmitting || !email || !passwordInput}
            className="admin-login-btn"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verificando...
              </span>
            ) : (
              'Entrar no Painel'
            )}
          </button>
        </form>

        <p className="text-[10px] text-center admin-login-text-secondary mt-6 leading-normal">
          O catálogo público continua acessível às suas clientes normalmente.
        </p>
      </div>
    </div>
  );
}
