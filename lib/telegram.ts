export async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

  if (!token || chatIds.length === 0) {
    return { skipped: true, reason: 'telegram_not_configured' };
  }

  const results: Array<{ chatId: string; ok: boolean; status?: number }> = [];

  await Promise.all(chatIds.map(async (chatId) => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      });
      results.push({ chatId, ok: res.ok, status: res.status });
    } catch {
      results.push({ chatId, ok: false });
    }
  }));

  return { skipped: false, results };
}

export function composeShippingTelegram(order: {
  tracking_code: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  cod_amount?: number;
  shipping_status?: string | null;
  delivery_failed_reason?: string | null;
}) {
  const status = order.shipping_status || 'Không rõ';
  let icon = '📦';
  if (status.toLowerCase().includes('đã giao')) icon = '✅';
  else if (status.toLowerCase().includes('không thành công')) icon = '❌';
  else if (status.toLowerCase().includes('trả')) icon = '↩️';

  const failedHint = (order.delivery_failed_reason || '').toLowerCase().includes('không nghe')
    ? '\n⚠️ Khách có thể không nghe máy, cần chăm sóc lại.'
    : '';

  return `${icon} <b>Cập nhật đơn SPX</b>\n` +
    `Mã: <code>${order.tracking_code}</code>\n` +
    `Khách: ${order.customer_name || '—'} (${order.customer_phone || '—'})\n` +
    `COD: ${(order.cod_amount || 0).toLocaleString('vi-VN')}đ\n` +
    `Trạng thái: <b>${status}</b>${failedHint}`;
}
