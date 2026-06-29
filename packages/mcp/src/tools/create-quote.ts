import { prisma } from '@inbox-pilot/db';

interface LineItem {
  sku: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export async function createQuote(
  inquiryId: string,
  lineItems: LineItem[],
  currency = 'USD',
) {
  const subtotal = lineItems.reduce((sum, li) => sum + li.qty * li.unitPrice, 0);
  const taxRate = 0.08;
  const tax = +(subtotal * taxRate).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const quote = await prisma.quote.upsert({
    where: { inquiryId },
    create: {
      inquiryId,
      lineItems,
      subtotal,
      tax,
      total,
      currency,
      validUntil,
    },
    update: {
      lineItems,
      subtotal,
      tax,
      total,
      currency,
      validUntil,
      status: 'DRAFT',
    },
  });

  return { quoteId: quote.id, subtotal, tax, total, currency, validUntil };
}
