import type { OrderSummary, SpxOrder } from '@/types/order';

export function summarizeOrders(orders: SpxOrder[]): OrderSummary {
  const statusBreakdown: Record<string, number> = {};
  let totalCod = 0;
  let totalOrderValue = 0;
  let totalShippingFee = 0;

  orders.forEach((o) => {
    totalCod += o.cod || 0;
    totalOrderValue += o.orderValue || 0;
    totalShippingFee += o.shippingFee || 0;
    const key = o.status || 'Không rõ';
    statusBreakdown[key] = (statusBreakdown[key] || 0) + 1;
  });

  return {
    totalOrders: orders.length,
    totalCod,
    totalOrderValue,
    totalShippingFee,
    statusBreakdown,
    trackingCodes: orders.map((o) => o.trackingCode),
  };
}
