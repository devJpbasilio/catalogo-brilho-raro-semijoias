/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utilitários monetários centralizados (fonte única de verdade para formatação
 * e arredondamento). Enquanto os valores permanecem em reais (número decimal),
 * `roundMoney` evita a propagação de erros de ponto flutuante em somas e divisões
 * — especialmente no cálculo de parcelas de fiado.
 */

/** Arredonda para 2 casas decimais de forma estável (centavos). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formata um número como moeda brasileira (R$). */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Divide um valor financiado em `count` parcelas exatas, garantindo que a soma
 * das parcelas seja idêntica ao total (a diferença de centavos do arredondamento
 * é absorvida na última parcela).
 */
export function splitInstallmentAmounts(financed: number, count: number): number[] {
  if (count <= 0 || financed <= 0) return [];
  const base = roundMoney(financed / count);
  const amounts: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    amounts.push(base);
  }
  amounts.push(roundMoney(financed - base * (count - 1)));
  return amounts;
}
