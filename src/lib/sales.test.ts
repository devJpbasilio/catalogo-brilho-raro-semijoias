/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { Sale, Installment } from '../types';
import {
  buildInstallments,
  shouldDecrementStock,
  computeOutstanding,
  applyInstallmentPayment,
  markSaleFullyPaid,
  payDownSale,
} from './sales';

function makeSale(over: Partial<Sale> = {}): Sale {
  return {
    id: 's1',
    customerId: 'c1',
    customerName: 'Teste',
    items: [{ productId: 'p1', productName: 'Anel', price: 150, quantity: 1 }],
    totalAmount: 150,
    paymentMethod: 'fiado',
    status: 'pending',
    date: '2026-01-15',
    createdAt: '2026-01-15T12:00:00.000Z',
    ...over,
  };
}

function insts(amounts: number[], paidCount = 0): Installment[] {
  return amounts.map((amount, i) => ({
    id: `i${i + 1}`,
    installmentNumber: i + 1,
    amount,
    dueDate: '2026-02-15',
    status: i < paidCount ? 'paid' : 'pending',
  }));
}

describe('buildInstallments', () => {
  it('gera N parcelas cuja soma é o valor financiado', () => {
    const list = buildInstallments(209.8, 0, 3, '2026-01-15');
    expect(list).toHaveLength(3);
    expect(list.every(i => i.status === 'pending')).toBe(true);
    const sum = list.reduce((a, i) => a + i.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(209.8);
  });

  it('desconta a entrada do valor financiado', () => {
    const list = buildInstallments(200, 50, 3, '2026-01-15');
    const sum = list.reduce((a, i) => a + i.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(150);
  });

  it('avança um mês por parcela a partir do primeiro vencimento', () => {
    const list = buildInstallments(300, 0, 3, '2026-01-15');
    expect(list.map(i => i.dueDate)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15']);
  });

  it('retorna vazio quando não há valor a financiar', () => {
    expect(buildInstallments(100, 100, 3, '2026-01-15')).toEqual([]);
  });
});

describe('shouldDecrementStock', () => {
  it('baixa em venda nova confirmada', () => {
    expect(shouldDecrementStock(null, makeSale({ status: 'paid' }))).toBe(true);
  });
  it('baixa ao aprovar um pedido do catálogo', () => {
    expect(shouldDecrementStock(makeSale({ status: 'order' }), makeSale({ status: 'paid' }))).toBe(true);
  });
  it('NÃO baixa ao editar venda já confirmada (evita duplicar)', () => {
    expect(shouldDecrementStock(makeSale({ status: 'pending' }), makeSale({ status: 'paid' }))).toBe(false);
  });
  it('NÃO baixa para pedido ainda não aprovado', () => {
    expect(shouldDecrementStock(null, makeSale({ status: 'order' }))).toBe(false);
  });
});

describe('computeOutstanding', () => {
  it('soma apenas as parcelas pendentes', () => {
    expect(computeOutstanding(insts([50, 50, 50], 1))).toBe(100);
  });
});

describe('applyInstallmentPayment', () => {
  it('quita uma parcela e deixa a venda parcial', () => {
    const sale = makeSale({ installments: insts([50, 50, 50]), outstandingBalance: 150 });
    const updated = applyInstallmentPayment(sale, 'i1', '2026-02-01T12:00:00.000Z');
    expect(updated.status).toBe('partial');
    expect(updated.outstandingBalance).toBe(100);
    expect(updated.installments!.find(i => i.id === 'i1')!.status).toBe('paid');
  });

  it('quita a última parcela e marca como paga', () => {
    const sale = makeSale({ installments: insts([50, 50, 50], 2), outstandingBalance: 50 });
    const updated = applyInstallmentPayment(sale, 'i3');
    expect(updated.status).toBe('paid');
    expect(updated.outstandingBalance).toBe(0);
  });
});

describe('markSaleFullyPaid', () => {
  it('quita todas as parcelas do fiado', () => {
    const sale = makeSale({ installments: insts([50, 50, 50]), outstandingBalance: 150 });
    const updated = markSaleFullyPaid(sale);
    expect(updated.status).toBe('paid');
    expect(updated.outstandingBalance).toBe(0);
    expect(updated.installments!.every(i => i.status === 'paid')).toBe(true);
  });
});

describe('payDownSale', () => {
  it('quita as parcelas mais antigas que couberem e deixa saldo', () => {
    const sale = makeSale({ installments: insts([50, 50, 50]), outstandingBalance: 150 });
    const { sale: updated, leftover } = payDownSale(sale, 100);
    expect(leftover).toBe(0);
    expect(updated.status).toBe('partial');
    expect(updated.outstandingBalance).toBe(50);
    expect(updated.installments!.filter(i => i.status === 'paid')).toHaveLength(2);
  });

  it('quita tudo e devolve o troco', () => {
    const sale = makeSale({ installments: insts([50, 50, 50]), outstandingBalance: 150 });
    const { sale: updated, leftover } = payDownSale(sale, 160);
    expect(updated.status).toBe('paid');
    expect(updated.outstandingBalance).toBe(0);
    expect(leftover).toBe(10);
  });
});
