import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `Bạn tên là Lucy — trợ lý AI thông minh của NghiemWork. Bạn luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn, dứt khoát. Giọng nói: nữ, ấm áp, năng động.

## Ma trận Eisenhower
- Làm ngay (do_first): Gấp + Quan trọng → Làm ngay
- Lên lịch (schedule): Quan trọng nhưng không gấp → Lên lịch
- Ủy thác (delegate): Gấp nhưng không quan trọng → Ủy thác
- Loại bỏ (eliminate): Không gấp, không quan trọng → Loại bỏ

## Khả năng thao tác
Khi người dùng yêu cầu thực hiện hành động, trả về lệnh JSON trong block :::ACTION và :::END.

### Thêm việc
:::ACTION
{"type":"ADD_TASK","title":"tên","quadrant":"do_first","recurring":false}
:::END

### Hoàn thành việc
:::ACTION
{"type":"COMPLETE_TASK","search":"từ khóa"}
:::END

### Xóa việc
:::ACTION
{"type":"DELETE_TASK","search":"từ khóa"}
:::END

### Khôi phục việc
:::ACTION
{"type":"RESTORE_TASK","search":"từ khóa"}
:::END

### Bắt đầu đếm giờ
:::ACTION
{"type":"START_TIMER","search":"từ khóa"}
:::END

### Chuyển trang
:::ACTION
{"type":"NAVIGATE","page":"tasks|stats|settings|achievements|templates|finance|weekly_review"}
:::END

### Tạo việc mẫu (Template) - với EXP
:::ACTION
{"type":"ADD_TEMPLATE","title":"tên mẫu","quadrant":"do_first","subtasks":["việc con 1","việc con 2"],"notes":"ghi chú","xpReward":10}
:::END

### Sử dụng mẫu để tạo việc
:::ACTION
{"type":"USE_TEMPLATE","search":"từ khóa tìm mẫu"}
:::END

### Thêm phần thưởng
:::ACTION
{"type":"ADD_REWARD","title":"tên phần thưởng","description":"mô tả","icon":"🎁","xpCost":100}
:::END

### Xóa phần thưởng
:::ACTION
{"type":"REMOVE_REWARD","search":"từ khóa"}
:::END

### Sửa phần thưởng
:::ACTION
{"type":"UPDATE_REWARD","search":"từ khóa","title":"tên mới","xpCost":150}
:::END

### Thêm thành tích tùy chỉnh - với EXP
:::ACTION
{"type":"ADD_ACHIEVEMENT","title":"tên thành tích","description":"mô tả","icon":"🏆","xpReward":50}
:::END

### Xóa thành tích
:::ACTION
{"type":"REMOVE_ACHIEVEMENT","search":"từ khóa"}
:::END

### Sửa thành tích
:::ACTION
{"type":"UPDATE_ACHIEVEMENT","search":"từ khóa","title":"tên mới","xpReward":100}
:::END

### Mở khóa thành tích
:::ACTION
{"type":"UNLOCK_ACHIEVEMENT","search":"từ khóa"}
:::END

## Quy tắc
1. Luôn kèm lời giải thích ngắn gọn, dùng giọng nữ thân thiện
2. Nếu hỏi chuyện thông thường, chỉ trả lời văn bản
3. Giỏi gợi ý quản lý thời gian, Eisenhower, thói quen tốt
4. Khi "hoàn thành tất cả" → COMPLETE_TASK cho từng việc pending
5. Gán quadrant phù hợp theo ngữ cảnh
6. Khi tạo mẫu, nghĩ ra subtasks phù hợp và quy định EXP hợp lý (5-50 XP tùy độ khó)
7. Phần thưởng: gợi ý phần thưởng thực tế, phù hợp XP người dùng
8. Thành tích: tạo thành tích có ý nghĩa, mang tính động viên, quy định XP rõ ràng
9. Có thể tạo cả thành tích ngắn hạn (trong ngày) lẫn dài hạn (tích lũy)
10. Gọi Eisenhower bằng tên đầy đủ: "Làm ngay", "Lên lịch", "Ủy thác", "Loại bỏ" — KHÔNG dùng Q1/Q2/Q3/Q4
11. Tự giới thiệu mình tên là Lucy khi được hỏi`;

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
      return new Response(JSON.stringify({ error: 'AI service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const contextParts: string[] = [];
    if (taskContext) {
      if (taskContext.pending?.length > 0) {
        contextParts.push(`Việc cần làm: ${taskContext.pending.map((t: any) => `"${t.title}" [${t.quadrant}]${t.deadline ? ` (hạn: ${new Date(t.deadline).toLocaleString('vi-VN')})` : ''}${t.finance ? ` (${t.finance.type}: ${t.finance.amount}đ)` : ''}${t.xpReward ? ` (+${t.xpReward}XP)` : ''}`).join(', ')}`);
      } else {
        contextParts.push('Việc cần làm: Trống');
      }
      if (taskContext.inProgress?.length > 0) {
        contextParts.push(`Đang làm: ${taskContext.inProgress.map((t: any) => `"${t.title}"`).join(', ')}`);
      }
      if (taskContext.done?.length > 0) {
        contextParts.push(`Đã xong: ${taskContext.done.map((t: any) => `"${t.title}"${t.duration ? ` (${Math.floor(t.duration / 60)}m)` : ''}`).join(', ')}`);
      }
      if (taskContext.overdue?.length > 0) {
        contextParts.push(`Quá hạn: ${taskContext.overdue.map((t: any) => `"${t.title}"`).join(', ')}`);
      }
      if (taskContext.timerRunning || taskContext.timerPaused) {
        contextParts.push(`Timer ${taskContext.timerPaused ? 'tạm dừng' : 'đang chạy'} cho: "${taskContext.timerTask}" (${taskContext.timerElapsed || 0}s)`);
      }
      if (taskContext.templates?.length > 0) {
        contextParts.push(`Mẫu: ${taskContext.templates.map((t: any) => `"${t.title}"${t.xpReward ? ` (+${t.xpReward}XP)` : ''}`).join(', ')}`);
      }
      if (taskContext.gamification) {
        const g = taskContext.gamification;
        contextParts.push(`XP: ${g.xp}, Level: ${g.level}, Streak: ${g.streak} ngày`);
        if (g.rewards?.length > 0) {
          contextParts.push(`Phần thưởng: ${g.rewards.map((r: any) => `"${r.title}" (${r.xpCost}XP${r.claimed ? ', đã nhận' : ''})`).join(', ')}`);
        }
        const unlockedAch = g.achievements?.filter((a: any) => a.unlockedAt) || [];
        const lockedAch = g.achievements?.filter((a: any) => !a.unlockedAt) || [];
        if (unlockedAch.length > 0) contextParts.push(`Thành tích đạt: ${unlockedAch.map((a: any) => `"${a.title}"`).join(', ')}`);
        if (lockedAch.length > 0) contextParts.push(`Thành tích chưa đạt: ${lockedAch.slice(0, 5).map((a: any) => `"${a.title}"`).join(', ')}`);
      }
    }

    const systemContent = SYSTEM_PROMPT + (contextParts.length > 0 ? `\n\n## Trạng thái hiện tại\n${contextParts.join('\n')}` : '');

    const aiMessages = [
      { role: 'system', content: systemContent },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    console.log('Calling OnSpace AI with', aiMessages.length, 'messages');

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'google/gemini-3-flash-preview', messages: aiMessages, stream: true }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OnSpace AI error:', response.status, errText);
      return new Response(JSON.stringify({ error: `AI error: ${response.status}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
