/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sale, Installment } from '../types';
import { roundMoney, splitInstallmentAmounts } from './money';

/**
 * Domínio de vendas — funções PURAS (sem I/O) para a lógica financeira crítica:
 * parcelamento de fiado, baixa de estoque e quitações. Centralizadas aqui para
 * eliminar duplicação (SalesTab/CustomersTab) e permitir testes automatizados.
 */

/** Gera um id curto para parcela. */
function newInstallmentId(): string {
  return `inst_${Math.random().toString(36).substring(2, 9)}`;
}

/** Soma dos saldos ainda pendentes (parcelas), arredondada em centavos. */
export function computeOutstanding(installments: Installment[]): number {
  const pending = installments
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + i.amount, 0);
  return roundMoney(pending);
}

/**
 * Monta o carnê de parcelas de uma venda fiado.
 * O valor financiado (total - entrada) é dividido em `count` parcelas exatas,
 * e cada vencimento avança um mês a partir de `firstDueDate` (YYYY-MM-DD).
 */
export function buildInstallments(
  total: number,
  downPayment: number,
  count: number,
  firstDueDate: string,
): Installment[] {
  const financed = Math.max(0, total - downPayment);
  if (financed <= 0 || count <= 0) return [];

  const amounts = splitInstallmentAmounts(financed, count);
  const list: Installment[] = [];

  for (let i = 1; i <= count; i++) {
    const d = new Date(firstDueDate + 'T12:00:00');
    if (i > 1) {
      d.setMonth(d.getMonth() + (i - 1));
    }
    list.push({
      id: newInstallmentId(),
      installmentNumber: i,
      amount: amounts[i - 1],
      dueDate: d.toISOString().split('T')[0],
      status: 'pending',
    });
  }
  return list;
}

/**
 * Decide se uma venda deve dar baixa no estoque ao ser salva.
 * Baixa acontece apenas na transição para venda confirmada (status !== 'order'):
 *  - venda nova já confirmada (previous == null), ou
 *  - pedido do catálogo sendo aprovado (previous.status === 'order').
 * Assim evita-se decremento duplicado ao apenas editar uma venda já confirmada.
 */
export function shouldDecrementStock(previous: Sale | null, next: Sale): boolean {
  return next.status !== 'order' && (previous === null || previous.status === 'order');
}

/** Marca UMA parcela como paga e recalcula status/saldo devedor da venda. */
export function applyInstallmentPayment(
  sale: Sale,
  installmentId: string,
  paidDate: string = new Date().toISOString(),
): Sale {
  if (!sale.installments) return sale;

  const installments = sale.installments.map(inst =>
    inst.id === installmentId
      ? { ...inst, status: 'paid' as const, paidDate }
      : inst,
  );

  const outstanding = computeOutstanding(installments);
  return {
    ...sale,
    installments,
    outstandingBalance: outstanding,
    status: outstanding === 0 ? 'paid' : 'partial',
  };
}

/** Quita integralmente uma venda (todas as parcelas, saldo zero). */
export function markSaleFullyPaid(
  sale: Sale,
  paidDate: string = new Date().toISOString(),
): Sale {
  if (sale.paymentMethod === 'fiado' && sale.installments) {
    const installments = sale.installments.map(inst => ({
      ...inst,
      status: 'paid' as const,
      paidDate: inst.status === 'paid' ? inst.paidDate : paidDate,
    }));
    return { ...sale, installments, outstandingBalance: 0, status: 'paid' };
  }
  return {
    ...sale,
    status: 'paid',
    ...(sale.outstandingBalance !== undefined && { outstandingBalance: 0 }),
  };
}

/**
 * Aplica um pagamento de `amount` a uma venda fiado, quitando as parcelas
 * pendentes mais antigas que couberem. Retorna a venda atualizada e o troco
 * (valor que sobrou e não coube em nenhuma parcela inteira).
 */
export function payDownSale(
  sale: Sale,
  amount: number,
  paidDate: string = new Date().toISOString(),
): { sale: Sale; leftover: number } {
  let remaining = amount;

  if (sale.installments && sale.installments.length > 0) {
    const installments = sale.installments.map(inst => {
      if (inst.status === 'pending' && remaining >= inst.amount) {
        remaining = roundMoney(remaining - inst.amount);
        return { ...inst, status: 'paid' as const, paidDate };
      }
      return inst;
    });
    const outstanding = computeOutstanding(installments);
    return {
      sale: {
        ...sale,
        installments,
        outstandingBalance: outstanding,
        status: outstanding === 0 ? 'paid' : 'partial',
      },
      leftover: roundMoney(remaining),
    };
  }

  // Venda legada sem parcelas detalhadas
  const currentOutstanding = sale.outstandingBalance !== undefined ? sale.outstandingBalance : sale.totalAmount;
  if (remaining >= currentOutstanding) {
    return {
      sale: { ...sale, outstandingBalance: 0, status: 'paid' },
      leftover: roundMoney(remaining - currentOutstanding),
    };
  }
  return {
    sale: { ...sale, outstandingBalance: roundMoney(currentOutstanding - remaining), status: 'partial' },
    leftover: 0,
  };
}
