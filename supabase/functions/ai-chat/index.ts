import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `Bạn là TaskFlow AI — trợ lý thông minh quản lý công việc hàng ngày. Bạn luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn, dứt khoát.

## Khả năng thao tác
Khi người dùng yêu cầu thực hiện hành động, bạn PHẢI trả về lệnh dạng JSON trong block đặc biệt. Mỗi lệnh nằm trong cặp tag :::ACTION và :::END.

### Thêm việc mới
:::ACTION
{"type":"ADD_TASK","title":"tên việc","recurring":false,"priority":"medium"}
:::END
Priority: "low", "medium", "high", "urgent"

### Hoàn thành việc
:::ACTION
{"type":"COMPLETE_TASK","search":"từ khóa tìm việc"}
:::END

### Xóa việc
:::ACTION
{"type":"DELETE_TASK","search":"từ khóa tìm việc"}
:::END

### Khôi phục việc
:::ACTION
{"type":"RESTORE_TASK","search":"từ khóa tìm việc"}
:::END

### Bắt đầu đếm giờ
:::ACTION
{"type":"START_TIMER","search":"từ khóa tìm việc"}
:::END

### Chuyển trang
:::ACTION
{"type":"NAVIGATE","page":"tasks|stats|settings"}
:::END

## Quy tắc quan trọng
1. Luôn kèm lời giải thích ngắn gọn TRƯỚC hoặc SAU các block :::ACTION
2. Nếu người dùng hỏi chuyện thông thường, chỉ trả lời văn bản, KHÔNG cần action
3. Bạn rất giỏi gợi ý cách quản lý thời gian, ưu tiên công việc, và tạo thói quen tốt
4. Khi user nói "hoàn thành tất cả", hãy tạo COMPLETE_TASK cho từng việc pending
5. Nếu không rõ user muốn gì, hãy hỏi lại
6. Bạn có thể trò chuyện về mọi chủ đề, không chỉ công việc
7. Khi tạo việc lặp lại, set recurring = true
8. Gán priority phù hợp dựa trên ngữ cảnh (gấp/quan trọng → high/urgent)`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, taskContext } = await req.json();

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      console.error('Missing ONSPACE_AI_API_KEY or ONSPACE_AI_BASE_URL');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contextParts: string[] = [];
    if (taskContext) {
      if (taskContext.pending?.length > 0) {
        contextParts.push(`Việc cần làm: ${taskContext.pending.map((t: any) => `"${t.title}" [${t.priority}]${t.deadline ? ` (hạn: ${new Date(t.deadline).toLocaleString('vi-VN')})` : ''}`).join(', ')}`);
      } else {
        contextParts.push('Việc cần làm: Trống');
      }
      if (taskContext.inProgress?.length > 0) {
        contextParts.push(`Đang làm: ${taskContext.inProgress.map((t: any) => `"${t.title}"`).join(', ')}`);
      }
      if (taskContext.done?.length > 0) {
        contextParts.push(`Đã hoàn thành: ${taskContext.done.map((t: any) => `"${t.title}"${t.duration ? ` (${Math.floor(t.duration/60)}m${t.duration%60}s)` : ''}`).join(', ')}`);
      }
      if (taskContext.overdue?.length > 0) {
        contextParts.push(`Quá hạn: ${taskContext.overdue.map((t: any) => `"${t.title}"`).join(', ')}`);
      }
      if (taskContext.timerRunning || taskContext.timerPaused) {
        contextParts.push(`Timer ${taskContext.timerPaused ? 'tạm dừng' : 'đang chạy'} cho: "${taskContext.timerTask}" (${taskContext.timerElapsed || 0}s)`);
      }
    }

    const systemContent = SYSTEM_PROMPT + (contextParts.length > 0
      ? `\n\n## Trạng thái hiện tại\n${contextParts.join('\n')}`
      : '');

    const aiMessages = [
      { role: 'system', content: systemContent },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    console.log('Calling OnSpace AI with', aiMessages.length, 'messages');

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OnSpace AI error:', response.status, errText);
      return new Response(
        JSON.stringify({ error: `AI error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
