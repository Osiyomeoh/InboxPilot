export const toolManifest = [
  {
    name: 'get_pricing',
    description: 'Returns current price and availability for a product SKU',
    parameters: {
      type: 'object',
      properties: {
        product: { type: 'string', description: 'Product SKU or name' },
        qty: { type: 'number', description: 'Quantity requested' },
      },
      required: ['product', 'qty'],
    },
  },
  {
    name: 'lookup_customer',
    description: 'Fetches CRM record for a customer by email: history, tier, credit limit',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Customer email address' },
      },
      required: ['email'],
    },
  },
  {
    name: 'create_quote',
    description: 'Persists a quote to the database and returns the quote ID',
    parameters: {
      type: 'object',
      properties: {
        inquiryId: { type: 'string' },
        lineItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sku: { type: 'string' },
              description: { type: 'string' },
              qty: { type: 'number' },
              unitPrice: { type: 'number' },
            },
          },
        },
        currency: { type: 'string', default: 'USD' },
      },
      required: ['inquiryId', 'lineItems'],
    },
  },
  {
    name: 'check_calendar',
    description: 'Checks delivery or service availability for a date range',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO date string' },
        endDate: { type: 'string', description: 'ISO date string' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'flag_for_human',
    description: 'Escalates an inquiry to the human approval queue',
    parameters: {
      type: 'object',
      properties: {
        inquiryId: { type: 'string' },
        reason: { type: 'string' },
        confidence: { type: 'number', description: '0-1 confidence score' },
      },
      required: ['inquiryId', 'reason', 'confidence'],
    },
  },
];
