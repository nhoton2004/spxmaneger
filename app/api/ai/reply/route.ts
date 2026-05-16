import { NextResponse } from 'next/server';

async function callAi(prompt: string) {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('AI_API_KEY chưa được cấu hình.');
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'Bạn là nhân viên chăm sóc khách hàng của shop.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'AI request failed');
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  return String(content);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customerMessage = String(body?.customerMessage || '').trim();
    const matchedOrders = Array.isArray(body?.matchedOrders) ? body.matchedOrders : [];

    const prompt = `Bạn là nhân viên chăm sóc khách hàng của shop.\nBạn chỉ được trả lời dựa trên dữ liệu đơn hàng được cung cấp.\nKhông bịa mã vận đơn, trạng thái, COD, ngày giao.\nKhông nói \"tôi là AI\".\nKhông nói \"theo dữ liệu hệ thống\".\nGiọng văn thân thiện, ngắn gọn.\n\nTIN NHẮN KHÁCH:\n${customerMessage}\n\nDỮ LIỆU ĐƠN TÌM ĐƯỢC:\n${JSON.stringify(matchedOrders, null, 2)}\n\nNếu có 1 đơn:\nTrả lời theo mẫu:\nDạ shop kiểm tra thấy đơn của mình mã {{trackingCode}} hiện đang ở trạng thái: {{status}}.\n\nNgười nhận: {{receiverName}}\nKhu vực: {{province}}\nCOD: {{cod}}\n\nNếu đang giao hàng thì nhắc khách chú ý điện thoại.\nNếu đang vận chuyển thì báo đơn đang trên đường vận chuyển.\nNếu đã giao thì báo đơn đã giao thành công.\nNếu đã hủy thì báo đơn đã hủy.\nNếu đang trả hàng hoặc đã trả hàng thì báo đơn đang/đã hoàn về shop.\n\nNếu có nhiều đơn:\nLiệt kê tối đa 5 đơn:\n1. {{trackingCode}} - {{receiverName}} - {{province}} - {{status}}\n\nSau đó hỏi khách gửi thêm số điện thoại hoặc tỉnh/thành để kiểm tra đúng đơn.\n\nNếu không có đơn:\nDạ shop chưa tìm thấy đơn theo thông tin này.\nMình gửi thêm giúp shop mã vận đơn, tên người nhận hoặc số điện thoại đặt hàng nha.`;

    const reply = await callAi(prompt);
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    return NextResponse.json({ reply: '', error: (err as Error).message }, { status: 200 });
  }
}
