export function normalizeOrderStatus(rawStatus) {
  const s = String(rawStatus || '').trim().toLowerCase();
  if (!s) return 'unknown';

  if (s.includes('đã giao') || s.includes('delivered') || s.includes('giao thành công')) return 'delivered';
  if (s.includes('đang vận chuyển') || s.includes('in transit') || s.includes('shipping') || s.includes('delivering')) return 'shipping';
  if (s.includes('lấy hàng không thành công') || s.includes('pickup failed')) return 'pickup_failed';
  if (s.includes('đang trả') || s.includes('returning')) return 'returning';
  if (s.includes('đã trả') || s.includes('returned')) return 'returned';
  if (s.includes('hủy') || s.includes('cancel') || s.includes('cancelled') || s.includes('canceled')) return 'cancelled';
  if (s.includes('chờ') || s.includes('pending') || s.includes('waiting')) return 'pending';

  return 'unknown';
}
