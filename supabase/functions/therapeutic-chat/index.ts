// Enhanced therapeutic chatbot with LLM integration, conversation memory, and RAG
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  channel?: 'web' | 'whatsapp';
  phoneNumber?: string;
  language?: 'en' | 'sw';
}

interface ConversationContext {
  topics_discussed: string[];
  emotional_state: string;
  risk_level: 'low' | 'moderate' | 'high';
  therapeutic_goals: string[];
  session_count: number;
  language_preference: string;
  recent_messages?: Array<{ role: string; content: string }>;
}

const crisisPhrases = [
  // English
  'suicide', 'kill myself', 'end my life', 'self harm', 'hurt myself', 'want to die', 'no point living',
  'better off dead', 'not worth living', 'end it all', 'overdose', 'cutting', 'razor', 'bridge',
  // Swahili
  'kujiua', 'nimechoka kuishi', 'najiumiza', 'najidhuru', 'sitaki kuishi', 'maisha haina maana',
  'ni afadhali nife', 'ninadhani kufa', 'hatuna haja ya kuishi'
];

function detectLanguage(text: string): 'en' | 'sw' {
  // Robust heuristic: match whole words, ignore very short particles to avoid false positives
  const cleaned = text.toLowerCase().replace(/[^\p{L}\s]/gu, ' ');
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  const swLex = new Set<string>([
    'habari','mambo','asante','karibu','pole','hujambo','sijambo','poa','sawa',
    'nina','niko','mimi','wewe','yeye','najisikia','wasiwasi','ninahitaji','tafadhali','msaada',
    'huzuni','furaha','hasira','uchovu','maumivu'
  ]);
  const enLex = new Set<string>([
    'hello','hi','please','sorry','help','feel','feeling','anxious','anxiety','sad','angry','happy',
    'family','work','school','support','stress','worried'
  ]);

  let sw = 0, en = 0;
  for (const w of tokens) {
    if (w.length < 3) continue; // ignore short particles like "na", "ya", "wa"
    if (swLex.has(w)) sw++;
    if (enLex.has(w)) en++;
  }

  if (sw > en) return 'sw';
  if (en > sw) return 'en';
  // Default to English on ties/unknown to avoid over-triggering Swahili
  return 'en';
}


function isCrisisMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return crisisPhrases.some(phrase => lower.includes(phrase));
}

async function searchKnowledge(supabase: any, query: string, lang: string, topK = 3) {
  try {
    const { data, error } = await supabase.functions.invoke('knowledge-search', {
      body: { query, lang, topK }
    });
    if (error) throw error;
    return data?.results || [];
  } catch (err) {
    console.warn('Knowledge search failed:', err);
    return [];
  }
}

async function callGroqLLM(message: string, context: any, language: string): Promise<string> {
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

  // Strong, compact therapeutic style with rapport-first guidance
  const systemPrompt = language === 'sw'
    ? `Wewe ni Bepawaa Care 💚, mshauri wa kisaikolojia wa AI.

KANUNI MUHIMU:
1) Lugha: Jibu kwa KISWAHILI TU — kamwe usibadilishe.
2) Urefu: FUPI sana — mistari 2-4.
3) Emojis: Tumia 1-2 emojis zenye staha (💚 🤗 😔 💪 🌟 ✨).
4) Mtiririko: (i) Tambua hisia, (ii) Uliza swali moja wazi, (iii) Malizia kwa joto la upendo.
5) Usalama: Ukisikia kujiua/kujidhuru → toa msaada wa haraka: Lifeline 116 (TZ) 🆘.
6) Ujenzi wa urafiki (rapport): Katika jumbe 2-3 za mwanzo, uliza swali moja rahisi ili kumfahamu mtumiaji (jina lake anapopenda, jambo kuu linalomsumbua, aina ya msaada anaopendelea). Epuka maelezo marefu.
`
    : `You are Bepawaa Care 💚, an AI mental health counselor.

CRITICAL RULES:
1) Language: Reply in ENGLISH ONLY — never switch.
2) Length: Keep it VERY SHORT — 2-4 lines.
3) Emojis: Always include 1-2 caring emojis (💚 🤗 😔 💪 🌟 ✨).
4) Flow: (i) Acknowledge emotion, (ii) Ask one open question, (iii) End warmly.
5) Safety: If suicide/self-harm → provide immediate help for Tanzania: 116 🆘.
6) Build rapport first: In the first 2-3 messages, ask one simple question to know the user (name preference, main concern, preferred support style). Avoid over-explaining.`;

  const conversationHistory = context?.recent_messages || [];
  const sess = typeof context?.session_count === 'number' ? context.session_count : 1;
  const extraContext = context?.emotional_state
    ? `\n\nContext: emotional_state=${context.emotional_state}; topics=${(context.topics_discussed||[]).join(', ')}; session_count=${sess}`
    : `\n\nContext: session_count=${sess}`;

  const messages = [
    { role: 'system', content: systemPrompt + extraContext },
    ...conversationHistory.slice(-6),
    { role: 'user', content: message }
  ];

  const ensureEmoji = (text: string) => {
    const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(text) || /💚|🤗|😔|💪|🌟|✨/.test(text);
    return hasEmoji ? text : `${text.trim()} 💚`;
  };

  // Try Groq first if configured, otherwise fall back to Lovable AI gateway
  const tryGroq = async () => {
    if (!groqApiKey) throw new Error('GROQ_API_KEY not configured');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        max_tokens: 260,
        temperature: 0.8,
        stream: false,
      }),
    });
    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    return ensureEmoji(content || (language === 'sw' 
      ? 'Samahani, nina tatizo la teknolojia. Tafadhali niambie kwa ufupi unajisikiaje sasa?'
      : "I'm having a technical issue. Briefly tell me how you feel right now?"));
  };

  const tryLovable = async () => {
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        stream: false,
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error('Rate limited by AI gateway');
      if (res.status === 402) throw new Error('Payment required by AI gateway');
      throw new Error(`AI gateway error: ${res.status}`);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    return ensureEmoji(content || (language === 'sw' 
      ? 'Samahani, nina tatizo la teknolojia. Tafadhali niambie kwa ufupi unajisikiaje sasa?'
      : "I'm having a technical issue. Briefly tell me how you feel right now?"));
  };

  try {
    if (groqApiKey) {
      return await tryGroq();
    }
    return await tryLovable();
  } catch (err) {
    console.error('LLM primary error:', err);
    try {
      // Fallback to the other provider if available
      if (groqApiKey && lovableApiKey) {
        return await tryLovable();
      }
      if (!groqApiKey && lovableApiKey) {
        return await tryLovable();
      }
      if (groqApiKey && !lovableApiKey) {
        return await tryGroq();
      }
    } catch (err2) {
      console.error('LLM secondary error:', err2);
    }
    return language === 'sw'
      ? 'Samahani, nina tatizo la teknolojia. Je, unaweza kuniambia kwa ufupi unajisikiaje sasa? 💚'
      : "I'm having a technical issue. Can you briefly tell me how you're feeling right now? 💚";
  }
}

async function analyzeEmotionalState(message: string, context: any): Promise<string> {
  const lowerMessage = message.toLowerCase();
  
  // Simple emotion detection
  if (lowerMessage.includes('sad') || lowerMessage.includes('huzuni') || lowerMessage.includes('depressed')) {
    return 'sad';
  }
  if (lowerMessage.includes('anxious') || lowerMessage.includes('worried') || lowerMessage.includes('wasiwasi')) {
    return 'anxious';
  }
  if (lowerMessage.includes('angry') || lowerMessage.includes('frustrated') || lowerMessage.includes('hasira')) {
    return 'angry';
  }
  if (lowerMessage.includes('happy') || lowerMessage.includes('good') || lowerMessage.includes('furaha')) {
    return 'positive';
  }
  
  return context?.emotional_state || 'neutral';
}

async function generateDynamicSuggestions(params: {
  message: string;
  language: string;
  emotionalState: string;
  sessionCount: number;
  topics: string[];
  usedKnowledge: boolean;
}): Promise<string[]> {
  const { message, language, emotionalState, sessionCount, topics, usedKnowledge } = params;
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

  // Occasionally suppress suggestions to feel more conversational
  const roll = Math.random();
  if (roll < 0.3) {
    return [];
  }

  const baseSystem = language === 'sw'
    ? `Wewe ni Bepawaa Care 💚.
Unaandika chaguo fupi za menyu ya WhatsApp (0-3 tu) kwa usaidizi wa afya ya akili.
LENGO: pendekeza vitufe vinavyosaidia kuliko kuzungumza moja kwa moja.

MAELEKEZO MUHIMU:
- Tumia KISWAHILI SANIFU, sentensi fupi sana.
- Rudisha tu vitu vya menyu, sio maelezo marefu.
- Zingatia hali ya kihisia, mada, hatua ya mazungumzo na idadi ya vikao.
- Aina za menyu zinazowezekana: "emotional_checkin", "actions", "resources", "navigation".
- Ruhusu pia "none" kama hakuna vitufe vinavyofaa kwa sasa.
`
    : `You are Bepawaa Care 💚.
You design very short WhatsApp quick-reply buttons (0-3 max) for a mental health chat.
GOAL: suggest helpful next steps, not continue the conversation yourself.

KEY RULES:
- Use simple, supportive English.
- Return only menu-style options, no long explanations.
- Consider emotion, topic, conversation stage, and session count.
- Possible suggestion_type values: "emotional_checkin", "actions", "resources", "navigation", or "none".
`;

  const convoStage = sessionCount <= 2 ? 'greeting' : sessionCount <= 6 ? 'middle' : 'action';
  const topicHint = topics.slice(-3).join(', ') || 'general mental health';

  const systemPrompt = `${baseSystem}\n\nContext summary: emotion=${emotionalState}; stage=${convoStage}; topics=${topicHint}; used_knowledge=${usedKnowledge}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content:
        language === 'sw'
          ? `Huu ndio ujumbe wa mtumiaji: "${message}"
Tafadhali chagua kati ya 0 na 3 mapendekezo ya vitufe vya haraka kwa hatua inayofuata.
Rudisha majibu kwa JSON pekee, bila maelezo mengine.`
          : `Here is the user's latest message: "${message}".
Please propose between 0 and 3 WhatsApp quick-reply options for the next step.
Respond with JSON only, no extra text.`
    }
  ];

  const body: any = {
    model: 'llama-3.1-8b-instant',
    messages,
    max_tokens: 200,
    temperature: 0.7,
    tools: [
      {
        type: 'function',
        function: {
          name: 'respond_with_suggestions',
          description: 'Choose contextual WhatsApp quick replies for the therapeutic chatbot.',
          parameters: {
            type: 'object',
            properties: {
              suggestion_type: {
                type: 'string',
                enum: ['none', 'emotional_checkin', 'actions', 'resources', 'navigation']
              },
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string' }
                  },
                  required: ['label'],
                  additionalProperties: false
                }
              }
            },
            required: ['suggestion_type', 'suggestions'],
            additionalProperties: false
          }
        }
      }
    ],
    tool_choice: { type: 'function', function: { name: 'respond_with_suggestions' } }
  };

  async function callProvider(url: string, apiKey: string, isLovable = false) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...(isLovable ? { model: 'google/gemini-2.5-flash' } : {}),
        ...body,
        stream: false
      })
    });
    if (!res.ok) throw new Error(`Suggestion provider error: ${res.status}`);
    const json = await res.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) return [];

    try {
      const parsed = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : argsRaw;
      if (parsed.suggestion_type === 'none') return [];
      const rawList = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
      const labels = rawList
        .map((s: any) => (s && typeof s.label === 'string' ? s.label.trim() : ''))
        .filter(Boolean)
        .slice(0, 3);
      return labels;
    } catch (err) {
      console.warn('Suggestion parse error:', err);
      return [];
    }
  }

  try {
    if (groqApiKey) {
      return await callProvider('https://api.groq.com/openai/v1/chat/completions', groqApiKey);
    }
    if (lovableApiKey) {
      return await callProvider('https://ai.gateway.lovable.dev/v1/chat/completions', lovableApiKey, true);
    }
  } catch (err) {
    console.warn('Dynamic suggestions error:', err);
  }

  // Fallback heuristic suggestions
  if (language === 'sw') {
    if (emotionalState === 'sad' || emotionalState === 'anxious') {
      return ['Nifundishe mbinu za kupumua 💨', 'Nisaidie kupanga hatua ndogo 💪'];
    }
    return ['Nieleze zaidi 💬', 'Mbinu za kukabiliana 💪'];
  }

  if (emotionalState === 'sad' || emotionalState === 'anxious') {
    return ['Breathing exercise 💨', 'Small next step plan 💪'];
  }

  return ['Tell me more 💬', 'Coping strategies 💪'];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { message, sessionId = 'anonymous', userId, channel = 'web', phoneNumber, language: preferredLang }: ChatRequest = await req.json();

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Auto-detect language if not provided
    const language = preferredLang || detectLanguage(message);
    console.log(`[Language Detection] Input: "${message.substring(0, 50)}..." | Detected: ${language}`);

    // Crisis intervention - highest priority
    if (isCrisisMessage(message)) {
      const crisisResponse = language === 'sw' 
        ? {
            content: 'Nina wasiwasi mkuu kuhusu usalama wako. **Tafadhali wasiliana na msaada wa haraka:**\n\n🚨 **Tanzania**: Piga 116 au nenda hospitali ya karibu\n🆘 **Hali ya dharura**: Wasiliana na mtu wa karibu au familia\n\nHujako peke yako. Msaada upo. Je, uko mahali salama sasa?',
            suggestions: ['Niko salama', 'Ninahitaji msaada wa haraka', 'Ningependa kuzungumza na mshauri'],
            priority: 'crisis'
          }
        : {
            content: 'I\'m very concerned about your safety right now. **Please reach out for immediate help:**\n\n🚨 **Tanzania**: Call 116 or go to nearest hospital\n🆘 **Emergency**: Contact a trusted friend or family member\n\nYou are not alone. Help is available. Are you in a safe place right now?',
            suggestions: ['I am safe', 'I need immediate help', 'I want to talk to a counselor'],
            priority: 'crisis'
          };

      return new Response(JSON.stringify(crisisResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get or create conversation
    let conversationId: string;
    let context: ConversationContext = {
      topics_discussed: [],
      emotional_state: 'neutral',
      risk_level: 'low',
      therapeutic_goals: [],
      session_count: 1,
      language_preference: language
    };

    const { data: existingConv } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .eq('channel', channel)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
      context = { ...context, ...existingConv.context };
    } else {
      const { data: newConv } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId || null,
          session_id: sessionId,
          channel,
          phone_number: phoneNumber,
          language,
          context
        })
        .select()
        .single();
      
      conversationId = newConv?.id;
    }

    // Get recent conversation history for context
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    const conversationHistory = recentMessages?.reverse().map(msg => ({
      role: msg.role,
      content: msg.content
    })) || [];

    context.recent_messages = conversationHistory;

    // Search knowledge base first
    const knowledgeResults: Array<{ chunk_text: string; topic: string }> = await searchKnowledge(supabase, message, language, 2);
    
    let response: string;
    let usedKnowledge = false;

    if (knowledgeResults.length > 0) {
      // Use knowledge base + LLM for contextual response
      const knowledgeContext = knowledgeResults.map((r: { chunk_text: string; topic: string }) => r.chunk_text).join('\n\n');
      const contextualMessage = `Based on this information: ${knowledgeContext}\n\nUser question: ${message}`;
      
      response = await callGroqLLM(contextualMessage, context, language);
      usedKnowledge = true;
    } else {
      // Pure LLM response for general therapy
      response = await callGroqLLM(message, context, language);
    }

    // Update emotional state and context
    const newEmotionalState = await analyzeEmotionalState(message, context);
    const updatedContext: ConversationContext = {
      ...context,
      emotional_state: newEmotionalState,
      session_count: context.session_count + 1,
      topics_discussed: [...new Set([...context.topics_discussed, ...knowledgeResults.map((r: { chunk_text: string; topic: string }) => r.topic).filter(Boolean)])]
    };

    // Save messages and update context
    await Promise.all([
      supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message
      }),
      supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'assistant', 
        content: response,
        metadata: { used_knowledge: usedKnowledge, knowledge_sources: knowledgeResults.length }
      }),
      supabase.from('chat_conversations')
        .update({ context: updatedContext, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
    ]);

    // Generate AI-powered contextual suggestions (0-3, sometimes none)
    const dynamicSuggestions = await generateDynamicSuggestions({
      message,
      language,
      emotionalState: newEmotionalState,
      sessionCount: updatedContext.session_count,
      topics: updatedContext.topics_discussed,
      usedKnowledge
    });

    // Use AI-driven suggestions as-is; if none are returned, omit buttons entirely
    const suggestions = dynamicSuggestions ?? [];

    return new Response(JSON.stringify({
      content: response,
      suggestions: suggestions,
      context: {
        emotional_state: newEmotionalState,
        session_count: updatedContext.session_count,
        used_knowledge: usedKnowledge
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Therapeutic chat error:', error);
    return new Response(JSON.stringify({ 
      error: 'I apologize, but I\'m having technical difficulties. Please try again in a moment.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});