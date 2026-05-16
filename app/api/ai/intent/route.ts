import { NextResponse } from 'next/server';

function extractJson(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

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
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'Bạn là bộ phân tích tin nhắn khách hàng cho shop.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
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

    if (!customerMessage) {
      return NextResponse.json({
        intent: 'unknown',
        trackingCode: '',
        receiverName: '',
        phone: '',
        province: '',
        district: '',
        dateFrom: '',
        dateTo: '',
        confidence: 0,
      });
    }

    const prompt = `Bạn là bộ phân tích tin nhắn khách hàng cho shop.\nHãy đọc tin nhắn và trích xuất thông tin liên quan đến đơn hàng.\nChỉ trả về JSON hợp lệ, không giải thích.\n\nTIN NHẮN KHÁCH:\n${customerMessage}\n\nTrả về:\n{\n  \"intent\": \"\",\n  \"trackingCode\": \"\",\n  \"receiverName\": \"\",\n  \"phone\": \"\",\n  \"province\": \"\",\n  \"district\": \"\",\n  \"dateFrom\": \"\",\n  \"dateTo\": \"\",\n  \"confidence\": 0\n}\n\nKhông bịa dữ liệu.\nNếu thiếu thông tin thì để chuỗi rỗng.`;

    const raw = await callAi(prompt);
    const jsonText = extractJson(raw) || '{}';
    const parsed = JSON.parse(jsonText);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        intent: 'unknown',
        trackingCode: '',
        receiverName: '',
        phone: '',
        province: '',
        district: '',
        dateFrom: '',
        dateTo: '',
        confidence: 0,
        error: (err as Error).message,
      },
      { status: 200 }
    );
  }
}
