export interface SpxOrder {
  id: string;
  userId: string | null;
  shopId: string | null;
  trackingCode: string;
  receiverName: string | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  address: string | null;
  status: string | null;
  cod: number;
  orderValue: number;
  shippingFee: number;
  createTime: string | null;
  pickupTime: string | null;
  deliveredTime: string | null;
  reason: string | null;
  items: string[];
  rawData: Record<string, unknown>;
  importedAt: string;
}

export interface OrderSummary {
  totalOrders: number;
  totalCod: number;
  totalOrderValue: number;
  totalShippingFee: number;
  statusBreakdown: Record<string, number>;
  trackingCodes: string[];
}

export interface CustomerIntent {
  intent: string;
  trackingCode?: string;
  receiverName?: string;
  phone?: string;
  province?: string;
  district?: string;
  dateFrom?: string;
  dateTo?: string;
  confidence?: number;
}
