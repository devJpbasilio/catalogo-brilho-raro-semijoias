/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sale, CashEntry } from '../types';

/**
 * Deriva as entradas de caixa a partir das vendas — função PURA (sem I/O),
 * para ser testável e reutilizável. Regras:
 *  - Pedidos do catálogo (status 'order') não afetam o caixa.
 *  - Vendas à vista/pix/cartão entram pelo total.
 *  - Vendas fiado entram por: entrada (downPayment) + parcelas pagas; ou, no
 *    formato legado sem parcelas, pelo total quando quitadas.
 *
 * Retorna apenas as entradas DERIVADAS de vendas (id prefixado com 'cash_sale_').
 * A camada de armazenamento é quem mescla com lançamentos manuais.
 */
export function deriveCashEntriesFromSales(sales: Sale[]): CashEntry[] {
  const entries: CashEntry[] = [];

  sales.forEach(s => {
    if (s.status === 'order') return; // pedidos do catálogo não afetam o caixa

    // Métodos não-fiado (inclui 'cash' legado)
    if (s.paymentMethod !== 'fiado' && s.paymentMethod !== 'credit') {
      let mappedMethod: 'pix' | 'card' | 'cash' | 'fiado' = 'cash';
      if (s.paymentMethod === 'pix') {
        mappedMethod = 'pix';
      } else if (s.paymentMethod === 'credit_card' || s.paymentMethod === 'debit_card') {
        mappedMethod = 'card';
      } else if (s.paymentMethod === 'cash') {
        mappedMethod = 'cash';
      }

      entries.push({
        id: `cash_sale_${s.id}`,
        type: 'in',
        amount: s.totalAmount,
        description: `Venda #${s.id.substring(0, 5)} - Cliente: ${s.customerName}`,
        date: s.date,
        saleId: s.id,
        createdAt: s.createdAt,
        paymentMethod: mappedMethod,
      });
      return;
    }

    // Venda fiado/crédito: entrada + parcelas pagas
    if (s.downPayment && s.downPayment > 0) {
      entries.push({
        id: `cash_sale_down_${s.id}`,
        type: 'in',
        amount: s.downPayment,
        description: `Entrada Venda Fiado #${s.id.substring(0, 5)} - Cliente: ${s.customerName}`,
        date: s.date,
        saleId: s.id,
        createdAt: s.createdAt,
        paymentMethod: 'fiado',
      });
    }

    if (s.installments) {
      s.installments.forEach(inst => {
        if (inst.status === 'paid') {
          entries.push({
            id: `cash_sale_inst_${s.id}_${inst.installmentNumber}`,
            type: 'in',
            amount: inst.amount,
            description: `Parcela ${inst.installmentNumber}/${s.installmentsCount || 1} Recebida #${s.id.substring(0, 5)} - Cliente: ${s.customerName}`,
            date: inst.paidDate ? inst.paidDate.split('T')[0] : s.date,
            saleId: s.id,
            createdAt: inst.paidDate || s.createdAt,
            paymentMethod: 'fiado',
          });
        }
      });
    } else if (s.status === 'paid') {
      // Legado: crédito quitado sem parcelas detalhadas
      entries.push({
        id: `cash_sale_full_${s.id}`,
        type: 'in',
        amount: s.totalAmount,
        description: `Quitação Venda Fiado #${s.id.substring(0, 5)} - Cliente: ${s.customerName}`,
        date: s.date,
        saleId: s.id,
        createdAt: s.createdAt,
        paymentMethod: 'fiado',
      });
    }
  });

  return entries;
}
