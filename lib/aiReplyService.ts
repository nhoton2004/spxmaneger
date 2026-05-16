import type { SpxOrder } from '@/types/order';
import { maskPhone } from './formatting';

function sanitizeOrders(orders: SpxOrder[]) {
  return orders.map((o) => ({
    trackingCode: o.trackingCode,
    receiverName: o.receiverName,
    province: o.province,
    district: o.district,
    status: o.status,
    cod: o.cod,
    phone: maskPhone(o.phone),
  }));
}

export async function generateCustomerReply(
  customerMessage: string,
  matchedOrders: SpxOrder[]
): Promise<string> {
  const res = await fetch('/api/ai/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerMessage, matchedOrders: sanitizeOrders(matchedOrders) }),
  });

  if (!res.ok) {
    return 'Dạ shop đang gặp lỗi khi kiểm tra đơn. Mình đợi shop xử lý xong rồi phản hồi lại nha.';
  }

  const data = await res.json();
  return String(data.reply || '').trim();
}
