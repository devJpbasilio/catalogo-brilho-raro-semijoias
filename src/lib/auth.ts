/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { User } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from './supabase';

/**
 * Indica se a autenticação real (Supabase Auth) está disponível.
 * Quando o Supabase não está configurado, o app roda em modo local
 * de dispositivo único, onde os dados nunca saem do navegador e o
 * gate de login não é uma fronteira de segurança real.
 */
export function isAuthAvailable(): boolean {
  return supabaseEnabled && !!supabase;
}

/**
 * Traduz erros do Supabase Auth para mensagens amigáveis em pt-BR.
 */
export function friendlyAuthError(error: unknown): string {
  const message = (error as { message?: string })?.message?.toLowerCase() || '';
  if (message.includes('invalid login') || message.includes('invalid credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (message.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }
  if (message.includes('network') || message.includes('failed to fetch')) {
    return 'Falha de conexão. Verifique sua internet.';
  }
  return 'Não foi possível entrar. Tente novamente.';
}

export async function signInAdmin(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Autenticação não configurada.');
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

export async function signOutAdmin(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Assina mudanças no estado de autenticação. Retorna a função de cancelamento.
 * Reporta imediatamente a sessão atual e, em modo local, "sem usuário".
 */
export function subscribeAuth(callback: (user: User | null) => void): () => void {
  if (!supabase) {
    callback(null);
    return () => {};
  }
  // Estado inicial (sessão persistida).
  supabase.auth.getSession().then(({ data }) => {
    callback(data.session?.user ?? null);
  });
  // Mudanças subsequentes (login/logout/refresh).
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => sub.subscription.unsubscribe();
}
