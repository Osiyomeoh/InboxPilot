const CRM: Record<string, object> = {
  'alice@acmecorp.com': {
    name: 'Alice Johnson',
    company: 'Acme Corp',
    tier: 'gold',
    creditLimit: 50000,
    totalOrders: 24,
    totalSpend: 87450,
    lastOrderDate: '2024-11-15',
    preferredCurrency: 'USD',
    notes: 'Prefers detailed quotes with breakdown',
  },
  'bob@startup.io': {
    name: 'Bob Smith',
    company: 'Startup.io',
    tier: 'silver',
    creditLimit: 10000,
    totalOrders: 5,
    totalSpend: 4200,
    lastOrderDate: '2024-09-02',
    preferredCurrency: 'USD',
    notes: 'Price-sensitive, often negotiates',
  },
};

export function lookupCustomer(email: string) {
  const record = CRM[email.toLowerCase()];
  if (record) return { found: true, ...record };

  return {
    found: false,
    email,
    tier: 'new',
    creditLimit: 5000,
    totalOrders: 0,
    totalSpend: 0,
    notes: 'New customer — no CRM history',
  };
}
