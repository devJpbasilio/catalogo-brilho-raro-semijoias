/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { Sale } from '../types';
import { deriveCashEntriesFromSales } from './cashflow';

function makeSale(over: Partial<Sale> = {}): Sale {
  return {
    id: 'abc123',
    customerId: 'c1',
    customerName: 'Ana',
    items: [{ productId: 'p1', productName: 'Anel', price: 100, quantity: 1 }],
    totalAmount: 100,
    paymentMethod: 'pix',
    status: 'paid',
    date: '2026-02-01',
    createdAt: '2026-02-01T12:00:00.000Z',
    ...over,
  };
}

describe('deriveCashEntriesFromSales', () => {
  it('venda à vista gera uma entrada no total, mapeando o método', () => {
    const [entry] = deriveCashEntriesFromSales([makeSale({ paymentMethod: 'pix', totalAmount: 120 })]);
    expect(entry.type).toBe('in');
    expect(entry.amount).toBe(120);
    expect(entry.paymentMethod).toBe('pix');
    expect(entry.id).toBe('cash_sale_abc123');
  });

  it('cartão (crédito/débito) vira método "card"', () => {
    const [e1] = deriveCashEntriesFromSales([makeSale({ paymentMethod: 'credit_card' })]);
    expect(e1.paymentMethod).toBe('card');
  });

  it('pedidos do catálogo (order) NÃO afetam o caixa', () => {
    expect(deriveCashEntriesFromSales([makeSale({ status: 'order', paymentMethod: 'order' })])).toEqual([]);
  });

  it('fiado gera entrada da entrada + parcelas pagas (ignora pendentes)', () => {
    const sale = makeSale({
      paymentMethod: 'fiado',
      status: 'partial',
      totalAmount: 200,
      downPayment: 50,
      installmentsCount: 2,
      installments: [
        { id: 'i1', installmentNumber: 1, amount: 75, dueDate: '2026-03-01', status: 'paid', paidDate: '2026-03-01T12:00:00.000Z' },
        { id: 'i2', installmentNumber: 2, amount: 75, dueDate: '2026-04-01', status: 'pending' },
      ],
    });
    const entries = deriveCashEntriesFromSales([sale]);
    expect(entries).toHaveLength(2); // entrada + 1 parcela paga
    expect(entries.map(e => e.amount).sort((a, b) => a - b)).toEqual([50, 75]);
    expect(entries.every(e => e.paymentMethod === 'fiado')).toBe(true);
  });

  it('crédito legado quitado sem parcelas gera a quitação pelo total', () => {
    const sale = makeSale({ paymentMethod: 'credit', status: 'paid', totalAmount: 90, installments: undefined });
    const entries = deriveCashEntriesFromSales([sale]);
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(90);
    expect(entries[0].id).toBe('cash_sale_full_abc123');
  });
});
