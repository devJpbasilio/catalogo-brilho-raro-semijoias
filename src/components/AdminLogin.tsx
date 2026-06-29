import React, { useState } from 'react';
import { BrandConfig } from '../types';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  brandConfig: BrandConfig;
  onLoginSuccess: () => void;
}

export default function AdminLogin({ brandConfig, onLoginSuccess }: AdminLoginProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLocked) return;

    setError(false);
    setShouldShake(false);

    // Se não houver senha cadastrada, libera o acesso direto (mas o App.tsx já cuida disso)
    if (!brandConfig.adminPassword) {
      onLoginSuccess();
      return;
    }

    setIsSubmitting(true);

    // Simulação rápida para parecer profissional e premium
    setTimeout(() => {
      setIsSubmitting(false);
      if (passwordInput.trim() === brandConfig.adminPassword) {
        sessionStorage.setItem('admin_authenticated', 'true');
        onLoginSuccess();
      } else {
        setError(true);
        setShouldShake(true);
        setIsLocked(true);
        setPasswordInput('');
        
        // Remove animação shake após 400ms
        setTimeout(() => {
          setShouldShake(false);
        }, 400);

        // Desbloqueia botão após 2 segundos
        setTimeout(() => {
          setIsLocked(false);
        }, 2000);
      }
    }, 600);
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
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mb-4">
              💎
            </div>
          )}

          {/* Nome da Loja */}
          <h2 className="font-serif font-bold text-2xl admin-login-text-primary tracking-tight">
            {brandConfig.brandName || 'Semijoias Pro'}
          </h2>
          <p className="text-[10px] font-semibold tracking-wider uppercase mt-1 admin-login-text-secondary">
            Painel Administrativo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="admin-login-label">
              Senha de Acesso
            </label>
            <div className="relative">
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                disabled={isSubmitting || isLocked}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Digite a senha"
                className="admin-login-input"
              />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting || isLocked}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6872] hover:text-[#2B1F28] focus:outline-none cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-[#9B2335] font-semibold mt-2">
                <AlertCircle className="w-4 h-4" />
                <span className="admin-login-text-error">Senha incorreta. Tente novamente.</span>
              </div>
            )}
          </div>

          <button
            id="btn-submit-login"
            type="submit"
            disabled={isSubmitting || isLocked || !passwordInput}
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
            ) : isLocked ? (
              'Bloqueado (Aguarde 2s)'
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
