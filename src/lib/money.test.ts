/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { roundMoney, formatBRL, splitInstallmentAmounts } from './money';

describe('roundMoney', () => {
  it('resolve o clássico erro de ponto flutuante 0.1 + 0.2', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it('arredonda para 2 casas', () => {
    expect(roundMoney(1.999)).toBe(2);
    expect(roundMoney(1.2345)).toBe(1.23);
    expect(roundMoney(10)).toBe(10);
  });
});

describe('formatBRL', () => {
  it('formata em reais com separadores pt-BR', () => {
    const s = formatBRL(1234.5);
    expect(s).toContain('R$');
    expect(s).toContain('1.234,50');
  });
});

describe('splitInstallmentAmounts', () => {
  it('a soma das parcelas é exatamente o valor financiado', () => {
    for (const [total, n] of [[100, 3], [209.8, 4], [1000, 7], [0.1, 3]] as const) {
      const parts = splitInstallmentAmounts(total, n);
      expect(parts).toHaveLength(n);
      expect(roundMoney(parts.reduce((a, b) => a + b, 0))).toBe(roundMoney(total));
    }
  });

  it('joga a diferença de centavos na última parcela', () => {
    const parts = splitInstallmentAmounts(100, 3);
    expect(parts).toEqual([33.33, 33.33, 33.34]);
  });

  it('retorna vazio para count ou valor inválido', () => {
    expect(splitInstallmentAmounts(0, 3)).toEqual([]);
    expect(splitInstallmentAmounts(100, 0)).toEqual([]);
  });
});
