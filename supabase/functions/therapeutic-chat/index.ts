// Enhanced therapeutic chatbot with HIV support companion, LLM integration, conversation memory, and RAG
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
  hiv_journey?: string; // 'pep_urgent' | 'prep_interest' | 'self_test' | 'emotional' | 'post_test' | null
  pep_hours_since_exposure?: number;
  calm_mode?: boolean;
}

// Crisis phrases (mental health)
const crisisPhrases = [
  'suicide', 'kill myself', 'end my life', 'self harm', 'hurt myself', 'want to die', 'no point living',
  'better off dead', 'not worth living', 'end it all', 'overdose', 'cutting',
  'kujiua', 'nimechoka kuishi', 'najiumiza', 'najidhuru', 'sitaki kuishi', 'maisha haina maana',
  'ni afadhali nife', 'ninadhani kufa'
];

// HIV-related keywords for topic detection
const hivKeywords = {
  pep_urgent: [
    'exposure', 'exposed', 'condom broke', 'condom break', 'unprotected sex', 'needle stick',
    'had sex without', 'rape', 'sexual assault', 'forced sex', 'pep', 'after exposure',
    'nimefanya ngono', 'kondomu imepasuka', 'nimechukuliwa kwa nguvu', 'baada ya kuambukizwa',
    'nimefanya bila kondomu', 'sindano', 'nimeambukizwa'
  ],
  prep: [
    'prep', 'prevent hiv', 'prevention', 'before exposure', 'daily pill prevention',
    'kinga ya vvu', 'kuzuia vvu', 'kabla ya kuambukizwa', 'dawa ya kuzuia'
  ],
  self_test: [
    'self test', 'self-test', 'test kit', 'home test', 'private test', 'test myself',
    'hiv test', 'testing', 'know my status', 'check status', 'get tested',
    'kujipima', 'kipimo', 'hali yangu', 'pima vvu', 'vifaa vya kupima'
  ],
  stigma_emotional: [
    'scared', 'afraid', 'ashamed', 'shame', 'stigma', 'discrimination', 'judge me',
    'worried about hiv', 'fear hiv', 'confused about hiv', 'panic',
    'naogopa', 'aibu', 'ubaguzi', 'wasiwasi kuhusu vvu', 'hofu', 'mimi peke yangu'
  ],
  post_test: [
    'positive result', 'tested positive', 'reactive', 'my result', 'negative result',
    'invalid result', 'what now', 'after testing',
    'matokeo chanya', 'nimepimwa na', 'matokeo yangu', 'nini sasa'
  ],
  hiv_general: [
    'hiv', 'aids', 'vvu', 'ukimwi', 'antiretroviral', 'art', 'cd4', 'viral load',
    'undetectable', 'u=u'
  ],
  bepawaa_services: [
    'order kit', 'book appointment', 'find pharmacy', 'find lab', 'cod', 'cash on delivery',
    'delivery', 'bepawaa service', 'what services',
    'agiza', 'panga miadi', 'tafuta duka', 'huduma'
  ]
};

function detectLanguage(text: string): 'en' | 'sw' {
  const cleaned = text.toLowerCase().replace(/[^\p{L}\s]/gu, ' ');
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const swLex = new Set([
    'habari','mambo','asante','karibu','pole','hujambo','sijambo','poa','sawa',
    'nina','niko','mimi','wewe','yeye','najisikia','wasiwasi','ninahitaji','tafadhali','msaada',
    'huzuni','furaha','hasira','uchovu','maumivu','vvu','ukimwi','naogopa','aibu',
    'nimefanya','kondomu','kupima','kujipima','dawa','kinga'
  ]);
  const enLex = new Set([
    'hello','hi','please','sorry','help','feel','feeling','anxious','anxiety','sad','angry','happy',
    'family','work','school','support','stress','worried','hiv','test','exposure','scared','afraid'
  ]);
  let sw = 0, en = 0;
  for (const w of tokens) {
    if (w.length < 3) continue;
    if (swLex.has(w)) sw++;
    if (enLex.has(w)) en++;
  }
  return sw > en ? 'sw' : 'en';
}

function isCrisisMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return crisisPhrases.some(phrase => lower.includes(phrase));
}

function detectHIVJourney(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [journey, keywords] of Object.entries(hivKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return journey;
    }
  }
  return null;
}

function detectCalmMode(text: string): boolean {
  const lower = text.toLowerCase();
  const panicIndicators = [
    'panic', 'panicking', 'freaking out', 'can\'t breathe', 'scared', 'terrified',
    'help me', 'what do i do', 'oh my god', 'im shaking',
    'naogopa sana', 'nisaidie', 'sijui nifanye nini', 'ninatetemeka'
  ];
  return panicIndicators.some(p => lower.includes(p));
}

function extractHoursSinceExposure(text: string): number | null {
  const lower = text.toLowerCase();
  // Match patterns like "2 hours ago", "yesterday", "3 days ago", "last night"
  const hourMatch = lower.match(/(\d+)\s*hours?\s*ago/);
  if (hourMatch) return parseInt(hourMatch[1]);
  
  const dayMatch = lower.match(/(\d+)\s*days?\s*ago/);
  if (dayMatch) return parseInt(dayMatch[1]) * 24;
  
  if (lower.includes('yesterday') || lower.includes('jana')) return 24;
  if (lower.includes('last night') || lower.includes('usiku uliopita')) return 12;
  if (lower.includes('this morning') || lower.includes('asubuhi')) return 6;
  if (lower.includes('just now') || lower.includes('sasa hivi') || lower.includes('just happened')) return 1;
  if (lower.includes('today') || lower.includes('leo')) return 6;
  if (lower.includes('last week') || lower.includes('wiki iliyopita')) return 168;
  if (lower.includes('few days') || lower.includes('siku chache')) return 72;
  
  return null;
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

function buildHIVSystemPrompt(language: string, context: ConversationContext): string {
  const isSwahili = language === 'sw';
  
  if (isSwahili) {
    return `Wewe ni Bepawaa Care 💚, mshauri wa AI wa msaada wa VVU na afya ya akili.

KANUNI MUHIMU:
1) Lugha: Jibu kwa KISWAHILI TU — kamwe usibadilishe.
2) Urefu: FUPI sana — mistari 3-6. Usiandike insha ndefu.
3) Emojis: Tumia 1-2 emojis zenye staha (💚 🤗 😔 💪 🌟 ✨ 🏥 💊).
4) Sauti: Utulivu, binadamu, bila hukumu, rafiki kwa waanzaji. Usisikike kama roboti.
5) Mtiririko: (i) Tambua hisia au wasiwasi, (ii) Jibu kwa uwazi, (iii) Toa hatua moja ya kufuata, (iv) Onyesha nia ya kusaidia.
6) Usalama: Ukisikia kujiua/kujidhuru → toa msaada wa haraka: Lifeline 116 (TZ) 🆘.
7) VVU: Usisababishe aibu kwa tabia ya kijinsia, kuambukizwa, au hofu. Kamwe usishurutishe ufunuzi.
8) PEP: Ikiwa mtumiaji ametajia kuambukizwa hivi karibuni, uliza LINI. Ndani ya masaa 72 = HARAKA. Zaidi ya masaa 72 = usipendekeze PEP; toa kupimwa na ushauri.
9) Msingi wa Matibabu: Tumia tu taarifa zilizothibitishwa. Ikiwa hujui, sema hivyo na muelekeze kwa mtoa huduma.
10) Faragha: Uyeka mtumiaji kuhusu faragha na usiri wa huduma za Bepawaa.
${context.calm_mode ? '\n11) HALI YA UTULIVU: Mtumiaji ana wasiwasi mkubwa. Tumia sentensi FUPI SANA. Toa hatua moja tu ya vitendo. Muahidi kukaa pamoja naye.' : ''}
${context.hiv_journey === 'pep_urgent' ? '\n⚡ DHARURA: Mtumiaji anaweza kuhitaji PEP. Uliza kuhusu wakati wa kuambukizwa ikiwa haijulikani. Sisitiza udharura (ndani ya masaa 72).' : ''}`;
  }

  return `You are Bepawaa Care 💚, an AI HIV support companion and mental health counselor.

CRITICAL RULES:
1) Language: Reply in ENGLISH ONLY — never switch mid-conversation.
2) Length: Keep it SHORT — 3-6 lines. No long essays.
3) Emojis: Always include 1-2 caring emojis (💚 🤗 😔 💪 🌟 ✨ 🏥 💊).
4) Tone: Calm, human, non-judgmental, beginner-friendly, stigma-free. Do NOT sound robotic.
5) Flow: (i) Acknowledge emotion or concern, (ii) Answer clearly, (iii) Give one next best action, (iv) Offer follow-up help.
6) Safety: If suicide/self-harm → provide immediate help: Tanzania Lifeline 116 🆘.
7) HIV: Never shame users for sexual behavior, exposure, or fear. Never force disclosure or moralize.
8) PEP: If user mentions recent possible HIV exposure, ask WHEN it happened. Within 72 hours = URGENT action. Beyond 72 hours = do NOT suggest PEP as effective; offer testing, provider contact, and prevention counseling.
9) Medical grounding: Use only verified information from provided context. If unsure, say so and route to a provider.
10) Privacy: Reassure users about the privacy and discretion of Bepawaa services.
11) PrEP: Explain as daily prevention pill. Guide to consultation/booking.
12) Self-testing: Explain privacy, ordering through Bepawaa, discreet delivery, and what to do after results.
13) Booking: When appropriate, suggest concrete Bepawaa actions (order kit, book consultation, find provider).
14) Do NOT diagnose. Do NOT invent medical facts. Do NOT give false certainty.
${context.calm_mode ? '\n⚡ CALM MODE: User is in panic/distress. Use VERY SHORT sentences. Give ONE practical next step only. Reassure them you are here.' : ''}
${context.hiv_journey === 'pep_urgent' ? '\n⚡ URGENT: User may need PEP. Ask about timing of exposure if unknown. Emphasize urgency (within 72 hours). Offer immediate booking/referral.' : ''}
${context.hiv_journey === 'post_test' ? '\n📋 POST-TEST: User is dealing with test results. Be especially gentle. Validate their feelings. Provide clear next steps based on result type.' : ''}`;
}

async function callGroqLLM(message: string, context: ConversationContext, language: string): Promise<string> {
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

  const systemPrompt = buildHIVSystemPrompt(language, context);
  const conversationHistory = context?.recent_messages || [];
  const sess = typeof context?.session_count === 'number' ? context.session_count : 1;
  
  const extraContext = [
    context?.emotional_state ? `emotional_state=${context.emotional_state}` : null,
    context?.hiv_journey ? `hiv_journey=${context.hiv_journey}` : null,
    context?.pep_hours_since_exposure != null ? `pep_hours=${context.pep_hours_since_exposure}` : null,
    context?.calm_mode ? `calm_mode=true` : null,
    `topics=${(context?.topics_discussed||[]).join(', ')}`,
    `session_count=${sess}`
  ].filter(Boolean).join('; ');

  const messages = [
    { role: 'system', content: `${systemPrompt}\n\nContext: ${extraContext}` },
    ...conversationHistory.slice(-8),
    { role: 'user', content: message }
  ];

  const ensureEmoji = (text: string) => {
    const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(text) || /💚|🤗|😔|💪|🌟|✨|🏥|💊/.test(text);
    return hasEmoji ? text : `${text.trim()} 💚`;
  };

  const tryGroq = async () => {
    if (!groqApiKey) throw new Error('GROQ_API_KEY not configured');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages, max_tokens: 400, temperature: 0.7, stream: false }),
    });
    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
    const data = await res.json();
    return ensureEmoji(data.choices?.[0]?.message?.content || '');
  };

  const tryLovable = async () => {
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${lovableApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages, stream: false }),
    });
    if (!res.ok) throw new Error(`AI gateway error: ${res.status}`);
    const data = await res.json();
    return ensureEmoji(data.choices?.[0]?.message?.content || '');
  };

  try {
    return groqApiKey ? await tryGroq() : await tryLovable();
  } catch (err) {
    console.error('LLM primary error:', err);
    try {
      if (groqApiKey && lovableApiKey) return await tryLovable();
    } catch (err2) {
      console.error('LLM secondary error:', err2);
    }
    return language === 'sw'
      ? 'Samahani, nina tatizo la teknolojia. Je, unaweza kuniambia kwa ufupi unajisikiaje sasa? 💚'
      : "I'm having a technical issue. Can you briefly tell me how you're feeling right now? 💚";
  }
}

async function analyzeEmotionalState(message: string, context: any): Promise<string> {
  const lower = message.toLowerCase();
  if (lower.match(/scared|afraid|terrified|panic|naogopa|hofu/)) return 'fearful';
  if (lower.match(/sad|huzuni|depressed|cry|hopeless/)) return 'sad';
  if (lower.match(/anxious|worried|nervous|wasiwasi/)) return 'anxious';
  if (lower.match(/ashamed|shame|aibu|guilty/)) return 'ashamed';
  if (lower.match(/angry|frustrated|hasira/)) return 'angry';
  if (lower.match(/confused|don.*know|sijui|lost/)) return 'confused';
  if (lower.match(/happy|good|furaha|better|relieved/)) return 'positive';
  return context?.emotional_state || 'neutral';
}

async function generateDynamicSuggestions(params: {
  message: string;
  language: string;
  emotionalState: string;
  hivJourney: string | null;
  sessionCount: number;
  topics: string[];
  usedKnowledge: boolean;
}): Promise<string[]> {
  const { language, emotionalState, hivJourney } = params;
  const isSw = language === 'sw';

  // HIV-specific contextual suggestions
  if (hivJourney === 'pep_urgent') {
    return isSw
      ? ['Nipate PEP sasa 🏥', 'Ilikuwa ndani ya masaa 72', 'Ninahitaji msaada']
      : ['Find PEP now 🏥', 'It was within 72 hours', 'I need help'];
  }
  if (hivJourney === 'prep') {
    return isSw
      ? ['Panga mashauriano ya PrEP', 'PrEP inafanyaje kazi?', 'Pata PrEP karibu nami']
      : ['Book PrEP consultation', 'How does PrEP work?', 'Find PrEP near me'];
  }
  if (hivJourney === 'self_test') {
    return isSw
      ? ['Agiza kifaa cha kupima 📦', 'Jinsi ya kutumia kipimo', 'Matokeo yangu yanamaanisha nini?']
      : ['Order test kit 📦', 'How to use the test', 'What do my results mean?'];
  }
  if (hivJourney === 'stigma_emotional') {
    return isSw
      ? ['Mbinu za kukabiliana', 'Zungumza na mshauri', 'Mimi si peke yangu']
      : ['Coping strategies', 'Talk to a counselor', 'I am not alone'];
  }
  if (hivJourney === 'post_test') {
    return isSw
      ? ['Matokeo chanya - nini sasa?', 'Matokeo hasi - hatua zinazofuata', 'Ninahitaji msaada wa kihisia']
      : ['Positive result - what now?', 'Negative result - next steps', 'I need emotional support'];
  }
  if (hivJourney === 'bepawaa_services') {
    return isSw
      ? ['Agiza vifaa vya kupima VVU', 'Panga miadi ya PrEP', 'Tafuta duka la dawa karibu']
      : ['Order HIV test kits', 'Book PrEP appointment', 'Find pharmacy near me'];
  }
  if (hivJourney === 'hiv_general') {
    return isSw
      ? ['VVU vinaenezwa vipi?', 'Kupimwa VVU', 'Kuishi na VVU']
      : ['How is HIV transmitted?', 'HIV testing', 'Living with HIV'];
  }

  // Emotional state suggestions
  if (emotionalState === 'fearful' || emotionalState === 'ashamed') {
    return isSw
      ? ['Niambie zaidi 💬', 'Zoezi la kupumua 🧘', 'Msaada wa faragha']
      : ['Tell me more 💬', 'Breathing exercise 🧘', 'Private support'];
  }

  // General fallback
  const roll = Math.random();
  if (roll < 0.25) return [];
  
  return isSw
    ? ['Niambie zaidi 💬', 'Msaada wa VVU', 'Zungumza na mshauri']
    : ['Tell me more 💬', 'HIV support', 'Talk to a counselor'];
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
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const language = preferredLang || detectLanguage(message);

    // Crisis intervention - highest priority
    if (isCrisisMessage(message)) {
      const crisisResponse = language === 'sw'
        ? {
            content: 'Nina wasiwasi mkuu kuhusu usalama wako. **Tafadhali wasiliana na msaada wa haraka:**\n\n🚨 **Tanzania**: Piga 116 au nenda hospitali ya karibu\n🆘 **Hali ya dharura**: Wasiliana na mtu wa karibu au familia\n\nHujako peke yako. Msaada upo. Je, uko mahali salama sasa? 💚',
            suggestions: ['Niko salama', 'Ninahitaji msaada wa haraka', 'Ningependa kuzungumza na mshauri'],
            priority: 'crisis'
          }
        : {
            content: "I'm very concerned about your safety right now. **Please reach out for immediate help:**\n\n🚨 **Tanzania**: Call 116 or go to nearest hospital\n🆘 **Emergency**: Contact a trusted friend or family member\n\nYou are not alone. Help is available. Are you in a safe place right now? 💚",
            suggestions: ['I am safe', 'I need immediate help', 'I want to talk to a counselor'],
            priority: 'crisis'
          };
      return new Response(JSON.stringify(crisisResponse), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
      language_preference: language,
      hiv_journey: undefined,
      calm_mode: false
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

    // Get recent conversation history
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(12);

    const conversationHistory = recentMessages?.reverse().map((msg: any) => ({
      role: msg.role,
      content: msg.content
    })) || [];

    context.recent_messages = conversationHistory;

    // Detect HIV journey and urgency
    const detectedJourney = detectHIVJourney(message);
    if (detectedJourney) {
      context.hiv_journey = detectedJourney;
    }

    // Detect calm mode (panic/distress)
    if (detectCalmMode(message)) {
      context.calm_mode = true;
    }

    // Extract PEP timing if relevant
    if (context.hiv_journey === 'pep_urgent') {
      const hours = extractHoursSinceExposure(message);
      if (hours !== null) {
        context.pep_hours_since_exposure = hours;
      }
    }

    // Search knowledge base (prioritize HIV topics)
    let searchQuery = message;
    if (detectedJourney) {
      // Enhance search with journey context
      const journeyHints: Record<string, string> = {
        pep_urgent: 'PEP post-exposure prophylaxis emergency HIV',
        prep: 'PrEP pre-exposure prophylaxis prevention HIV',
        self_test: 'HIV self-test kit home testing private',
        stigma_emotional: 'HIV stigma emotional support coping',
        post_test: 'HIV test results positive negative what to do',
        hiv_general: 'HIV basics transmission prevention treatment',
        bepawaa_services: 'Bepawaa services HIV test kits PrEP PEP ordering'
      };
      searchQuery = `${message} ${journeyHints[detectedJourney] || ''}`;
    }

    const knowledgeResults: Array<{ chunk_text: string; topic: string }> = await searchKnowledge(supabase, searchQuery, language, 3);

    let response: string;
    let usedKnowledge = false;

    if (knowledgeResults.length > 0) {
      const knowledgeContext = knowledgeResults.map((r) => r.chunk_text).join('\n\n');
      const contextualMessage = `Based on this verified information:\n---\n${knowledgeContext}\n---\n\nUser message: ${message}\n\nRespond using the information above. Be concise, empathetic, and action-oriented. If the user needs PEP urgently, emphasize the 72-hour window.`;
      response = await callGroqLLM(contextualMessage, context, language);
      usedKnowledge = true;
    } else {
      response = await callGroqLLM(message, context, language);
    }

    // Update emotional state and context
    const newEmotionalState = await analyzeEmotionalState(message, context);
    const updatedContext: ConversationContext = {
      ...context,
      emotional_state: newEmotionalState,
      session_count: context.session_count + 1,
      topics_discussed: [...new Set([
        ...context.topics_discussed,
        ...knowledgeResults.map((r) => r.topic).filter(Boolean),
        ...(detectedJourney ? [detectedJourney] : [])
      ])]
    };

    // Reset calm_mode after one response if user seems calmer
    if (context.calm_mode && newEmotionalState === 'positive') {
      updatedContext.calm_mode = false;
    }

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
        metadata: {
          used_knowledge: usedKnowledge,
          knowledge_sources: knowledgeResults.length,
          hiv_journey: detectedJourney,
          calm_mode: context.calm_mode
        }
      }),
      supabase.from('chat_conversations')
        .update({ context: updatedContext, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
    ]);

    // Generate contextual suggestions
    const suggestions = await generateDynamicSuggestions({
      message,
      language,
      emotionalState: newEmotionalState,
      hivJourney: detectedJourney || context.hiv_journey || null,
      sessionCount: updatedContext.session_count,
      topics: updatedContext.topics_discussed,
      usedKnowledge
    });

    return new Response(JSON.stringify({
      content: response,
      suggestions,
      priority: detectedJourney === 'pep_urgent' ? 'urgent' : undefined,
      context: {
        emotional_state: newEmotionalState,
        session_count: updatedContext.session_count,
        used_knowledge: usedKnowledge,
        hiv_journey: detectedJourney || context.hiv_journey
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Therapeutic chat error:', error);
    return new Response(JSON.stringify({
      error: "I apologize, but I'm having technical difficulties. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
