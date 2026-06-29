const CATALOG: Record<string, { unitPrice: number; available: boolean; leadDays: number }> = {
  'SKU-100': { unitPrice: 49.99, available: true, leadDays: 3 },
  'SKU-200': { unitPrice: 129.99, available: true, leadDays: 5 },
  'SKU-300': { unitPrice: 299.99, available: false, leadDays: 14 },
  'WIDGET-A': { unitPrice: 24.99, available: true, leadDays: 2 },
  'WIDGET-B': { unitPrice: 74.99, available: true, leadDays: 4 },
  'SERVICE-BASIC': { unitPrice: 199.0, available: true, leadDays: 1 },
  'SERVICE-PRO': { unitPrice: 499.0, available: true, leadDays: 1 },
};

export function getPricing(product: string, qty: number) {
  const key = product.toUpperCase().replace(/\s+/g, '-');
  const item = CATALOG[key] ?? { unitPrice: 99.99, available: true, leadDays: 7 };
  const volumeDiscount = qty >= 100 ? 0.15 : qty >= 50 ? 0.10 : qty >= 10 ? 0.05 : 0;
  const unitPrice = +(item.unitPrice * (1 - volumeDiscount)).toFixed(2);

  return {
    product,
    sku: key,
    qty,
    unitPrice,
    subtotal: +(unitPrice * qty).toFixed(2),
    available: item.available,
    leadDays: item.leadDays,
    volumeDiscount: volumeDiscount > 0 ? `${volumeDiscount * 100}%` : null,
  };
}
