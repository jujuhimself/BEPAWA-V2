import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase service role configuration");
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

interface TherapeuticChatBody {
  message: string;
  language?: "en" | "sw";
  sessionId?: string;
  userId?: string | null;
  channel?: "web" | "whatsapp";
  phoneNumber?: string | null;
}

interface ChatMessageRow {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const systemPrompt = `You are Bepawa Care, a warm, trauma‑informed mental health supporter.

GOALS
- Offer short, compassionate, non‑judgmental support
- Help users explore feelings safely
- Offer simple, culturally sensitive coping tools
- Escalate clearly when there are safety risks

STYLE
- 1–3 short paragraphs max
- Use simple, conversational language
- Never diagnose or label
- Ask one clear follow‑up question at a time

SUGGESTIONS SYSTEM
You will not send suggestions directly to the user. Instead, you will CALL A TOOL with:
{
  "reply": string,                      // the full message you want the user to see
  "suggestions": string[] | undefined,  // 0–3 short button texts
  "priority": "normal" | "crisis"      // crisis if any self‑harm / suicide / immediate danger
}

When to include suggestions:
- Early in the chat: often 1–3 suggestions (emotional check‑ins, coping actions, resources)
- During deep sharing: SOMETIMES 0 suggestions to feel more human
- After crisis/safety messages: usually 1 action‑oriented suggestion

Good suggestion types:
- Emotional check‑ins: "Share more about today", "How are you coping right now?"
- Actions: "Breathing exercise", "Grounding exercise", "Journaling prompt"
- Navigation: "Change topic", "Talk about stress at home", "Talk about relationships"
- Resources: "Learn coping tips", "When to seek professional help"`;

async function getConversationAndMessages(body: TherapeuticChatBody) {
  if (!supabase) throw new Error("Supabase client not initialized");

  const sessionId = body.sessionId || "web-session";
  const channel = body.channel || "web";
  const language = body.language || "en";

  // Try to find existing conversation by session + channel
  const { data: existing, error: convError } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("session_id", sessionId)
    .eq("channel", channel)
    .order("created_at", { ascending: false })
    .limit(1);

  if (convError) {
    console.error("Error loading conversation:", convError);
    throw convError;
  }

  let conversation = existing && existing.length > 0 ? existing[0] : null;

  if (!conversation) {
    const userId = body.userId && body.userId.length > 0
      ? body.userId
      : crypto.randomUUID();

    const { data: inserted, error: insertError } = await supabase
      .from("chat_conversations")
      .insert({
        user_id: userId,
        session_id: sessionId,
        channel,
        phone_number: body.phoneNumber ?? null,
        language,
        context: {},
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Error creating conversation:", insertError);
      throw insertError;
    }

    conversation = inserted;
  }

  const { data: messages, error: msgError } = await supabase
    .from("chat_messages")
    .select("id, role, content, metadata, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(30);

  if (msgError) {
    console.error("Error loading messages:", msgError);
    throw msgError;
  }

  return { conversation, messages: (messages || []) as ChatMessageRow[] };
}

async function callLovableAI(body: TherapeuticChatBody, history: ChatMessageRow[]) {
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY is not configured");
    return {
      reply:
        body.language === "sw"
          ? "Samahani, kuna tatizo la kiteknolojia kwa sasa. Je, unaweza kuniambia kwa kifupi unajisikiaje sasa?"
          : "I'm having a technical issue right now, but I'm still here with you. Can you share briefly how you're feeling at this moment?",
      suggestions: [
        body.language === "sw" ? "Niongeze zaidi" : "Tell me more",
        body.language === "sw" ? "Nipatie mbinu za kukabiliana" : "Coping strategies",
      ],
      priority: "normal" as const,
    };
  }

  const messagesForModel = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
    {
      role: "user" as const,
      content: body.message,
    },
  ];

  const payload: Record<string, unknown> = {
    model: "google/gemini-2.5-flash",
    messages: messagesForModel,
    tools: [
      {
        type: "function",
        function: {
          name: "set_therapeutic_response",
          description:
            "Return the therapeutic reply plus optional dynamic suggestions and priority level.",
          parameters: {
            type: "object",
            properties: {
              reply: { type: "string" },
              suggestions: {
                type: "array",
                items: { type: "string" },
              },
              priority: {
                type: "string",
                enum: ["normal", "crisis"],
              },
            },
            required: ["reply"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: {
      type: "function",
      function: { name: "set_therapeutic_response" },
    },
  };

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("AI gateway error", response.status, text);
    throw new Error("AI gateway error");
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  // Try to read tool call arguments
  const toolCall = choice?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    console.warn("No tool calls returned, falling back to plain message");
    const content = choice?.message?.content ?? body.message;
    return {
      reply: typeof content === "string" ? content : body.message,
      suggestions: [],
      priority: "normal" as const,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(toolCall.function.arguments as string);
  } catch (e) {
    console.error("Failed to parse tool arguments", e, toolCall.function.arguments);
    return {
      reply: body.message,
      suggestions: [],
      priority: "normal" as const,
    };
  }

  const reply: string = parsed.reply ?? body.message;
  const suggestions: string[] = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.slice(0, 3)
    : [];
  const priority: "normal" | "crisis" =
    parsed.priority === "crisis" ? "crisis" : "normal";

  return { reply, suggestions, priority };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = (await req.json()) as TherapeuticChatBody;

    if (!body.message || !body.message.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversation, messages } = await getConversationAndMessages(body);

    // Insert the new user message first so it becomes part of history
    if (supabase) {
      const { error: insertUserError } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversation.id,
          role: "user",
          content: body.message,
          metadata: {
            channel: body.channel || "web",
            phoneNumber: body.phoneNumber ?? null,
          },
        });
      if (insertUserError) {
        console.error("Error inserting user message:", insertUserError);
      } else {
        messages.push({
          id: "temp",
          role: "user",
          content: body.message,
          metadata: null,
          created_at: new Date().toISOString(),
        });
      }
    }

    const aiResult = await callLovableAI(body, messages);

    if (supabase) {
      const { error: insertAssistantError } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversation.id,
          role: "assistant",
          content: aiResult.reply,
          metadata: {
            suggestions: aiResult.suggestions,
            priority: aiResult.priority,
            channel: body.channel || "web",
            phoneNumber: body.phoneNumber ?? null,
          },
        });
      if (insertAssistantError) {
        console.error("Error inserting assistant message:", insertAssistantError);
      }
    }

    const responsePayload = {
      content: aiResult.reply,
      suggestions: aiResult.suggestions,
      priority: aiResult.priority,
      conversationId: conversation.id,
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("therapeutic-chat error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
};

serve(handler);
