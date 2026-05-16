import type { CustomerIntent } from '@/types/order';

const EMPTY_INTENT: CustomerIntent = {
  intent: 'unknown',
  trackingCode: '',
  receiverName: '',
  phone: '',
  province: '',
  district: '',
  dateFrom: '',
  dateTo: '',
  confidence: 0,
};

export async function extractCustomerIntent(customerMessage: string): Promise<CustomerIntent> {
  const res = await fetch('/api/ai/intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerMessage }),
  });

  if (!res.ok) {
    return EMPTY_INTENT;
  }

  const data = (await res.json()) as CustomerIntent;
  return {
    ...EMPTY_INTENT,
    ...data,
  };
}
