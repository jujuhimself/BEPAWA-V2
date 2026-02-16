import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X, Send, Bot, User, HelpCircle, TrendingUp, FileText, Stethoscope, Pill, Calculator, Users, Calendar } from 'lucide-react';
import { carePacks, TopicId } from '@/content/care/packs';
import { useAuth } from '@/contexts/AuthContext';
import { findGuidelines, treatmentGuidelines } from '@/data/treatmentGuidelines';
import { supabase } from '@/integrations/supabase/client';
import { translateSync } from '@/integrations/translate/index';
import { route, type OrchestratorInput, type Lang } from '@/agents/care/orchestrator';

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  category?: 'medical' | 'business' | 'general' | 'symptom' | 'lab' | 'medication' | 'inventory' | 'order' | 'appointment';
  isFollowUp?: boolean;
}

interface ConversationContext {
  lastTopic?: string;
  userMedications?: string[];
  pendingReminders?: boolean;
  lastSymptoms?: string[];
  awaitingFollowUp?: string;
}

// --- Bepawa Care Lite helper responses (module scope) ---
const getBreathingExerciseResponse = (): Message => ({
  id: Date.now().toString(),
  type: 'bot',
  content: `🧘 Breathing Exercise (Box Breathing)

Try this for 2–4 minutes:
1) Inhale through your nose for 4 seconds
2) Hold your breath for 4 seconds
3) Exhale slowly through your mouth for 4 seconds
4) Hold for 4 seconds

Repeat the cycle. Tip: Keep shoulders relaxed. You can also place one hand on your belly to feel the breath.

Would you like a timed version?`,
  timestamp: new Date(),
  suggestions: ['Start 2-minute timer', 'More coping tools', 'Talk to a counselor'],
  category: 'general'
});

const getStressSelfCheckResponse = (): Message => ({
  id: Date.now().toString(),
  type: 'bot',
  content: `🧭 Stress Self-Check

Think about the last 2 weeks and rate the following (0=None, 1=Several days, 2=More than half, 3=Nearly every day):
• Felt overwhelmed or unable to control important things?
• Difficulty relaxing or sleeping?
• Irritable or on edge?

You can reply like: "Stress: 2,2,1". I’ll give general guidance and coping tips.

Note: This is not a diagnosis. For persistent or severe symptoms, talk to a professional.`,
  timestamp: new Date(),
  suggestions: ['Stress: 1,1,2', 'Breathing exercise', 'Book a counselor'],
  category: 'general'
});

const getAnxietyScaleResponse = (): Message => ({
  id: Date.now().toString(),
  type: 'bot',
  content: `🧪 Anxiety Quick Check

Over the last 2 weeks, how often have you been bothered by:
1) Feeling nervous, anxious, or on edge
2) Not being able to stop or control worrying

Rate each: 0=Not at all, 1=Several days, 2=More than half, 3=Nearly every day
Reply like: "Anxiety: 1,2" and I’ll provide general guidance.

Note: This is a screening prompt and not a medical diagnosis.`,
  timestamp: new Date(),
  suggestions: ['Anxiety: 0,1', 'Breathing exercise', 'HIV stigma support'],
  category: 'general'
});

const getHIVStigmaSupportResponse = (): Message => ({
  id: Date.now().toString(),
  type: 'bot',
  content: `❤️ HIV Stigma Support

You deserve care and respect. Here are supportive options:
• Private chat via WhatsApp for counseling (confidential)
• Guidance on disclosure at your own pace
• Connection to local resources and support groups

Would you like coping tips, disclosure guidance, or to talk to a counselor now?`,
  timestamp: new Date(),
  suggestions: ['Coping tips', 'Disclosure guidance', 'Talk to a counselor'],
  category: 'general'
});

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const { user } = useAuth();
  const [langPref, setLangPref] = useState<'auto'|'en'|'sw'>('auto');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load persisted language preference (localStorage then Supabase profile)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bepawa_care_lang');
      if (stored === 'en' || stored === 'sw' || stored === 'auto') {
        setLangPref(stored);
      }
    } catch {}

    // Best-effort fetch from profile if available
    (async () => {
      try {
        if (user?.id) {
          const { data } = await supabase
            .from('profiles')
            .select('preferred_lang')
            .eq('id', user.id)
            .single();
          const pref = data?.preferred_lang as 'auto'|'en'|'sw'|undefined;
          if (pref === 'en' || pref === 'sw' || pref === 'auto') {
            setLangPref(pref);
          }
        }
      } catch {
        // ignore if column or table not present
      }
    })();
  // run once on mount/user change
  }, [user?.id]);

  // Persist preference on change
  useEffect(() => {
    try { localStorage.setItem('bepawa_care_lang', langPref); } catch {}
    (async () => {
      try {
        if (user?.id) {
          await supabase
            .from('profiles')
            .update({ preferred_lang: langPref })
            .eq('id', user.id);
        }
      } catch {
        // ignore if schema not ready; localStorage still works
      }
    })();
  }, [langPref, user?.id]);

  // --- Care Packs: Topic detection and simple flows (stateless) ---
  const detectTopic = (text: string): TopicId | null => {
    const lower = text.toLowerCase();
    for (const t of carePacks.topics) {
      if (t.labels.some(lbl => lower.includes(lbl))) return t.id;
    }
    return null;
  };

  const getTopicMenuResponse = (topic: TopicId, lang: 'sw'|'en' = 'en'): Message => {
    const name = carePacks.topics.find(t => t.id === topic)?.name || 'Topic';
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: lang === 'sw'
        ? `Tuzingatie mada ya ${name}. Ungependa kufanya nini?`
        : `Let's focus on ${name}. What would you like to do?`,
      timestamp: new Date(),
      suggestions: [
        `FAQs about ${name}`,
        `Quick check (${name})`,
        `Coping tools (${name})`,
        'Talk to a counselor'
      ],
      category: 'general'
    };
  };

  const getTopicFaqsResponse = (topic: TopicId, lang: 'sw'|'en' = 'en'): Message => {
    const pack = carePacks.faqs[topic];
    let list = (lang === 'sw' ? pack?.sw : pack?.en) || [];

    // Swahili fallback: if SW list empty but EN exists, translate EN items synchronously
    if (lang === 'sw' && (!list || list.length === 0) && pack?.en?.length) {
      list = pack.en.slice(0, 3).map((f) => ({
        q: translateSync(f.q, { target: 'sw', source: 'en', hint: 'therapy', safe: true }),
        a: translateSync(f.a, { target: 'sw', source: 'en', hint: 'therapy', safe: true })
      }));
    }

    const faqs = (list || []).slice(0, 3);
    const name = carePacks.topics.find(t => t.id === topic)?.name;
    const content = faqs.length
      ? (lang === 'sw'
          ? `Maswali ya kawaida kuhusu ${name}:
${faqs.map(f => `• ${f.q}\n  ${f.a}`).join('\n')}`
          : `Here are a few common questions on ${name}:
${faqs.map(f => `• ${f.q}\n  ${f.a}`).join('\n')}`)
      : (lang === 'sw' ? 'Kwa sasa nina maswali machache juu ya mada hii.' : 'I have limited FAQs on this topic for now.');
    return {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date(),
      suggestions: ['Coping tools', 'Quick check', 'Talk to a counselor'],
      category: 'general'
    };
  };

  const getQuickCheckPrompt = (topic: TopicId, lang: 'sw'|'en' = 'en'): Message => {
    // Map topic to PHQ2 or GAD2
    const isMood = topic === 'depression' || topic === 'stress';
    const phq = lang === 'sw' ? carePacks.screenings.phq2.questions_sw : carePacks.screenings.phq2.questions_en;
    const gad = lang === 'sw' ? carePacks.screenings.gad2.questions_sw : carePacks.screenings.gad2.questions_en;
    const questions = isMood ? phq : gad;
    const code = isMood ? 'PHQ2' : 'GAD2';
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: lang === 'sw'
        ? `Tufanye tathmini fupi (${code}). Jibu kwa namba mbili 0-3 (mfano: "${code}: 1,2").\n\n1) ${questions[0]}\n2) ${questions[1]}\n\n0=Hapana kabisa, 1=Siku chache, 2=Zaidi ya nusu ya siku, 3=Karibu kila siku`
        : `Let's do a quick check (${code}). Answer with two numbers 0-3 (e.g., "${code}: 1,2").\n\n1) ${questions[0]}\n2) ${questions[1]}\n\n0=Not at all, 1=Several days, 2=More than half, 3=Nearly every day`,
      timestamp: new Date(),
      suggestions: [`${code}: 0,1`, 'Coping tools', 'Talk to a counselor'],
      category: 'general'
    };
  };

  const getScreeningResult = (code: 'PHQ2'|'GAD2', values: number[]): Message => {
    const sum = values.reduce((a,b)=>a+b,0);
    let advice = '';
    if (sum <= 2) advice = 'Low risk. Keep healthy routines and check in with yourself.';
    else if (sum <= 4) advice = 'Possible concern. Try coping tools and consider a counselor if it persists.';
    else advice = 'Significant concern. I recommend talking to a licensed counselor.';
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `${code} total: ${sum}. ${advice}\n\nNote: This is not a diagnosis. Your wellbeing matters.`,
      timestamp: new Date(),
      suggestions: ['Coping tools', 'Talk to a counselor', 'Breathing exercise'],
      category: 'general'
    };
  };

  const getGroundingExerciseResponse = (): Message => ({
    id: Date.now().toString(),
    type: 'bot',
    content: `Grounding 5-4-3-2-1\n\n• 5 things you can see\n• 4 things you can feel\n• 3 things you can hear\n• 2 things you can smell\n• 1 thing you can taste\n\nGo slowly. Notice details.`,
    timestamp: new Date(),
    suggestions: ['Start 2-minute timer', 'Talk to a counselor', 'More coping tools'],
    category: 'general'
  });

  const crisisPhrases = [
    'suicide', 'kill myself', 'end my life', 'self harm',
    'kujiua', 'nimechoka kuishi', 'najiumiza', 'najidhuru'
  ];
  const isCrisis = (text: string) => crisisPhrases.some(p => text.includes(p));

  // --- Language detection (very lightweight) ---
  const swahiliTokens = ['wasiwasi','msongo','huzuni','fedha','uhusiano','mapenzi','msiba','kujifungua','nime','sina','je'];
  const detectLang = (text: string): 'sw'|'en' => swahiliTokens.some(t => text.includes(t)) ? 'sw' : 'en';

  const counselorLinksMessage = (lang: 'sw'|'en'): Message => ({
    id: Date.now().toString(),
    type: 'bot',
    content: lang === 'sw'
      ? 'Nashauri uunganishwe na mshauri wa kitaalamu kwa msaada zaidi. Unaweza kuzungumza kupitia WhatsApp au kuweka miadi ya siri (chat/video).\n\n• WhatsApp: https://wa.me/255744969325\n• Book session: /appointments'
      : 'I recommend connecting with a licensed counselor for more support. You can use WhatsApp or book a confidential session (chat/video).\n\n• WhatsApp: https://wa.me/255744969325\n• Book session: /appointments',
    timestamp: new Date(),
    suggestions: ['Start 2-minute timer', 'Grounding exercise'],
    category: 'general'
  });


  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const getRoleSpecificGreeting = () => {
        if (!user) return "Hello! 💚 I'm Bepawa Care, your mental health companion. I'm here to listen and support you. How are you feeling today?";
        
        switch (user.role) {
          case 'individual':
            return `Hello ${user.name}! 💚 I'm Bepawa Care. I'm here to support your mental health and wellbeing. How are you feeling today?`;
          case 'retail':
            return `Welcome back, ${user.pharmacyName}! 🏪 I'm your business assistant. I can provide inventory insights, restock suggestions, standard treatment guidelines, order summaries, and even generate quick invoices. How can I assist your pharmacy today?`;
          case 'wholesale':
            return `Hello ${user.businessName}! 📦 I can help with bulk order planning, profitability analysis, distributor management, and retailer support. What would you like to explore?`;
          case 'lab':
            return `Welcome, ${user.labName}! 🔬 I can assist with smart test routing, appointment management, result interpretation, and referral generation. How can I help your laboratory today?`;
          case 'admin':
            return `Hello Admin! 👨‍💼 I can help with platform analytics, user management, system monitoring, and operational insights. What would you like to review?`;
          default:
            return "Hello! 💚 I'm Bepawa Care. I'm here to listen and support you. How are you feeling today?";
        }
      };

      const getRoleSpecificSuggestions = () => {
        if (!user) return [
          'I feel stressed 😔',
          'I need someone to talk to 💬',
          'I feel anxious 😰',
          'I have alcohol addiction 🍺',
          'Coping strategies 💪',
          'Book a counselor 🤝'
        ];
        
        switch (user.role) {
          case 'individual':
            return [
              'I feel stressed 😔',
              'I need someone to talk to 💬',
              'I feel anxious 😰',
              'Coping strategies 💪',
              'Breathing exercise 🧘',
              'Book a counselor 🤝'
            ];
          case 'retail':
            return ['What’s the first-line treatment for malaria in adults?', 'What’s the dosage for paracetamol in children?', 'Show me inventory insights', 'Generate sales report', 'Treatment guidelines', 'Cardiac arrest protocol'];
          case 'wholesale':
            return ['Bulk order assistant', 'Profit analysis', 'Retailer management', 'Market trends'];
          case 'lab':
            return ['Recommend tests', 'Appointment schedule', 'Generate referral', 'Interpret results'];
          case 'admin':
            return ['Platform analytics', 'User insights', 'System status', 'Revenue reports'];
          default:
            return ['I feel stressed 😔', 'I need someone to talk to 💬', 'Coping strategies 💪'];
        }
      };

      const greeting: Message = {
        id: '1',
        type: 'bot',
        content: getRoleSpecificGreeting(),
        timestamp: new Date(),
        suggestions: getRoleSpecificSuggestions(),
        category: 'general'
      };
      setMessages([greeting]);
    }
  }, [isOpen, user]);

  // Cleanup all running timers when widget closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      timersRef.current.forEach((id) => clearInterval(id));
      timersRef.current = [];
    }
    return () => {
      timersRef.current.forEach((id) => clearInterval(id));
      timersRef.current = [];
    };
  }, [isOpen]);

  const stopAllTimers = () => {
    timersRef.current.forEach((id) => clearInterval(id));
    timersRef.current = [];
    // Mark any active timer messages as stopped
    setMessages((prev) => prev.map((m) =>
      m.content.includes('Breathing Timer') && m.content.includes('Remaining')
        ? { ...m, content: `${m.content}\n\n⏹️ Timer stopped.` }
        : m
    ));
  };

  const startTwoMinuteBreathingTimer = () => {
    const totalSeconds = 120;
    const startTs = Date.now();
    const msgId = (Date.now() + Math.random()).toString();

    const renderPhase = (sec: number) => {
      const phaseIdx = Math.floor((sec % 16) / 4); // 0..3
      const phases = ['Inhale', 'Hold', 'Exhale', 'Hold'];
      return phases[phaseIdx];
    };

    const renderBar = (remaining: number) => {
      const done = totalSeconds - remaining;
      const blocks = 20;
      const filled = Math.min(blocks, Math.floor((done / totalSeconds) * blocks));
      return `${'█'.repeat(filled)}${'░'.repeat(blocks - filled)}`;
    };

    // Seed bot message
    const seed: Message = {
      id: msgId,
      type: 'bot',
      content: `🧘 Breathing Timer (2:00)\nPhase: Inhale\nRemaining: 2:00\n${'░'.repeat(20)}`,
      timestamp: new Date(),
      category: 'general'
    };
    setMessages((prev) => [...prev, seed]);

    const intervalId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTs) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsed);
      const mm = String(Math.floor(remaining / 60)).padStart(1, '0');
      const ss = String(remaining % 60).padStart(2, '0');
      const phase = renderPhase(elapsed);
      const bar = renderBar(remaining);

      setMessages((prev) => prev.map((m) => m.id === msgId ? {
        ...m,
        content: `🧘 Breathing Timer (${mm}:${ss})\nPhase: ${phase}\nRemaining: ${mm}:${ss}\n${bar}`
      } : m));

      if (remaining <= 0) {
        clearInterval(intervalId);
        timersRef.current = timersRef.current.filter((id) => id !== intervalId);
        setMessages((prev) => prev.map((m) => m.id === msgId ? {
          ...m,
          content: `✅ Breathing complete!\nGreat job taking a mindful break.\n\nWant to do another round or try a different tool?`,
          suggestions: ['Breathing exercise', 'Stress self-check', 'Talk to a counselor']
        } : m));
      }
    }, 1000);

    timersRef.current.push(intervalId);
  };

  // Individual Role Features
  const getMedicationTrackerResponse = (query: string): Message => {
    const medications = ['Metformin 500mg - 2x daily', 'Lisinopril 10mg - 1x daily', 'Vitamin D - 1x daily'];
    
    if (query.toLowerCase().includes('add') || query.toLowerCase().includes('new')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `💊 **Medication Tracker**\n\nTo add a new medication, I'll need:\n• Medication name and dosage\n• Frequency (how often)\n• When to take it\n• Duration of treatment\n\nWhat medication would you like to add?`,
        timestamp: new Date(),
        suggestions: ['Add Paracetamol 500mg', 'Set reminder for current meds', 'View my medications'],
        category: 'medication'
      };
    }

    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `💊 **Your Current Medications**\n\n${medications.map((med, i) => `${i + 1}. ${med}`).join('\n')}\n\n⏰ **Next Reminders:**\n• Metformin - Due in 2 hours\n• Lisinopril - Due tomorrow morning\n\nWould you like to add a new medication or set up reminders?`,
      timestamp: new Date(),
      suggestions: ['Add new medication', 'Set reminder times', 'Mark as taken', 'Refill reminder'],
      category: 'medication'
    };
  };

  const getNearbyServicesResponse = (): Message => {
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `📍 **Nearby Healthcare Services**\n\n🏥 **Pharmacies Near You:**\n• Duka la Dawa - 0.5km (Open 24/7)\n• HealthCare Pharmacy - 1.2km (8AM-10PM)\n• City Medical Store - 1.8km (9AM-9PM)\n\n🔬 **Labs & Diagnostic Centers:**\n• QuickLab Diagnostics - 0.8km\n• MediTest Center - 1.5km\n• City Lab Services - 2.1km\n\n🏥 **Hospitals:**\n• Muhimbili Hospital - 3.2km\n• Aga Khan Hospital - 4.1km`,
      timestamp: new Date(),
      suggestions: ['Get directions', 'Check pharmacy stock', 'Book lab appointment', 'Call pharmacy'],
      category: 'general'
    };
  };

  const getPharmacistChatResponse = (query: string): Message => {
    const responses = {
      'interaction': 'Drug interactions can be serious. Always inform your pharmacist about all medications you\'re taking, including supplements.',
      'side effects': 'Common side effects vary by medication. If you experience unusual symptoms, contact your pharmacist or doctor immediately.',
      'dosage': 'Never adjust medication dosages without consulting your healthcare provider. Proper timing and dosage are crucial for effectiveness.',
      'storage': 'Store medications in a cool, dry place away from direct sunlight. Some medications require refrigeration - check the label.'
    };

    const responseKey = Object.keys(responses).find(key => query.toLowerCase().includes(key));
    const advice = responseKey ? responses[responseKey as keyof typeof responses] : 
      'I\'d be happy to help with your medication question. For specific medical advice, please consult with a licensed pharmacist or your healthcare provider.';

    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `👨‍⚕️ **Pharmacist Consultation**\n\n${advice}\n\n⚠️ **Important**: This is general guidance. For personalized advice about your specific medications, please visit your local pharmacy or consult your healthcare provider.`,
      timestamp: new Date(),
      suggestions: ['Drug interactions', 'Side effects', 'Proper storage', 'Dosage timing'],
      category: 'medical'
    };
  };

  // Treatment Guideline Helper for Retail Pharmacy
const dosageCalculator = (msg: string): Message | null => {
  const weightMatch = msg.match(/(\d+\.?\d*)\s*(kg|kilograms?)/i);
  if (!weightMatch) return null;
  const weight = parseFloat(weightMatch[1]);

  if (msg.includes('amoxicillin')) {
    const perKg = 25;
    const daily = perKg * weight;
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `🧮 **Amoxicillin Dose**\n\nWeight: ${weight} kg\nDaily dose: ${perKg} mg/kg → ${daily.toFixed(0)} mg/day\nSplit into 3 doses: ${(daily/3).toFixed(0)} mg q8h`,
      timestamp: new Date(),
      category: 'medical'
    };
  }

  if (msg.includes('paracetamol') || msg.includes('acetaminophen')) {
    const perKg = 15;
    const single = perKg * weight;
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `🧮 **Paracetamol Dose**\n\nWeight: ${weight} kg\nSingle dose: ${single.toFixed(0)} mg (15 mg/kg) q6h\nMax 24-h: ${(60*weight).toFixed(0)} mg`,
      timestamp: new Date(),
      category: 'medical'
    };
  }

  return {
    id: Date.now().toString(),
    type: 'bot',
    content: 'Supported drugs: amoxicillin, paracetamol. Include weight e.g., "calculate amoxicillin 18 kg"',
    timestamp: new Date(),
    category: 'medical'
  };
};
const listAvailableGuidelinesText = () => treatmentGuidelines.map(g => `• ${g.condition}`).join('\n');

const getDosageCalculatorResponse = (): Message => ({
  id: Date.now().toString(),
  type: 'bot',
  content: `🧮 **Dosage Calculator**\n\nEnter the medication name and patient weight/age, and I'll help calculate the appropriate pediatric or weight-based dose. (Feature coming soon – meanwhile, follow standard references like BNF or WHO weight bands.)`,
  timestamp: new Date(),
  suggestions: ['Calculate amoxicillin dose', 'Calculate paracetamol dose', 'Cancel'],
  category: 'medical'
});

const getDrugInteractionResponse = (): Message => ({
  id: Date.now().toString(),
  type: 'bot',
  content: `⚠️ **Drug Interaction Checker**\n\nPlease enter two or more drug names separated by commas and I'll check for major interactions. (Prototype – consult a pharmacist for final confirmation.)`,
  timestamp: new Date(),
  suggestions: ['Metformin, Ciprofloxacin', 'Warfarin, Amoxicillin', 'Ibuprofen, Prednisolone'],
  category: 'medical'
});

const getTreatmentGuidelineResponse = (query: string): Message | null => {
  const lower = query.toLowerCase();
  
  // dosage calculator
  if (lower.includes('dosage') || lower.includes('calculate')) {
    const calc = dosageCalculator(lower);
    if (calc) return calc;
  }

  // list guidelines
  if (lower.includes('more guidelines') || lower.includes('all guidelines') || lower.includes('list') || lower === 'treatment guidelines') {
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `📚 **Available Standard Treatment Guidelines**\n\n${listAvailableGuidelinesText()}\n\nAsk me about any condition or medication name.`,
      timestamp: new Date(),
      category: 'medical',
      suggestions: ['Malaria', 'Hypertension', 'Measles', 'Amoxicillin']
    };
  }

  // Always try to match first – the improved findGuidelines now searches medications too
  const matches = findGuidelines(query);
  
  if (matches.length > 0) {
    // Found matches – format and return them
  } else {
    // No matches found – check if user intended a medical query or something else
    const medicalIntent = lower.includes('guideline') || lower.includes('treatment') || lower.includes('protocol') || lower.includes('dosage') || lower.includes('calculate') || lower.includes('drug') || lower.includes('medication') || lower.includes('dose');
    
    if (!medicalIntent) {
      // Could be a non-medical query; return null to let other handlers try
      return null;
    }
    
    // Handle generic keyword queries
    if (lower.includes('dosage') || lower.includes('dose')) return getDosageCalculatorResponse();
    if (lower.includes('interaction')) return getDrugInteractionResponse();
    if (lower.includes('guidelines') || lower.includes('more')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `📚 **Available Treatment Guidelines**\n\n${listAvailableGuidelinesText()}\n\nAsk me about any of these conditions or medications (e.g., "measles", "amoxicillin").`,
        timestamp: new Date(),
        suggestions: ['Malaria', 'Hypertension', 'Measles', 'UTI'],
        category: 'medical'
      };
    }

    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `❌ I couldn't find a standard treatment guideline matching "${query}".\n\nTry searching by condition (e.g., "measles", "hypertension") or medication name (e.g., "amoxicillin", "metformin").\n\nType **"list all guidelines"** to see everything available.`,
      timestamp: new Date(),
      suggestions: ['List all guidelines', 'Measles', 'Hypertension', 'UTI'],
      category: 'medical'
    };
  }

  const formatted = matches.map(g => {
    const first = g.firstLine.map(fl => `• ${fl.medication} – ${fl.dosage} for ${fl.duration}${fl.notes ? ` (${fl.notes})` : ''}`).join('\n');
    const second = g.secondLine && g.secondLine.length ? `\nSecond-line:\n${g.secondLine.map(sl => `• ${sl.medication} – ${sl.dosage} for ${sl.duration}${sl.notes ? ` (${sl.notes})` : ''}`).join('\n')}` : '';
    return `### ${g.condition}\n\nFirst-line:\n${first}${second}\n\n**Precautions:** ${g.precautions.join(', ')}\n**Refer if:** ${g.whenToRefer.join(', ')}\n**Counseling:** ${g.patientCounseling.join(', ')}`;
  }).join('\n\n---\n\n');

  return {
    id: Date.now().toString(),
    type: 'bot',
    content: formatted,
    timestamp: new Date(),
    suggestions: ['More guidelines', 'Dosage calculator', 'Drug interactions'],
    category: 'medical'
  };
};

// Retail Pharmacy Features
  const getInventoryInsightsResponse = (): Message => {
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `📊 **Weekly Inventory Insights**\n\n⚠️ **Low Stock Alerts (5 items):**\n• Paracetamol 500mg - 45 units left\n• Amoxicillin 250mg - 28 units left\n• Insulin - 12 units left\n\n🔥 **Top Sellers This Week:**\n1. Vitamin C (180 sold)\n2. Paracetamol (145 sold)\n3. Cough Syrup (89 sold)\n\n📈 **Revenue Impact:**\n• Weekly sales: TZS 2,450,000\n• Profit margin: 28.5%`,
      timestamp: new Date(),
      suggestions: ['Restock recommendations', 'View detailed analytics', 'Generate reorder list', 'Sales forecast'],
      category: 'inventory'
    };
  };

  const getRestockSuggestionResponse = (): Message => {
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `🔄 **Smart Restock Suggestions**\n\n**Immediate Action Needed:**\n• Insulin - Order 50 units (3-day supply left)\n• Paracetamol - Order 200 units (high demand)\n\n**Recommended Orders:**\n• Amoxicillin - 100 units (TZS 45,000)\n• Vitamin C - 150 units (TZS 22,500)\n• Blood pressure meds - 80 units (TZS 96,000)\n\n💰 **Total Order Value:** TZS 163,500\n⏱️ **Expected ROI:** 35% over 2 weeks`,
      timestamp: new Date(),
      suggestions: ['Generate purchase order', 'Contact suppliers', 'Set auto-reorder', 'View supplier prices'],
      category: 'inventory'
    };
  };

  const getOrderSummaryResponse = (): Message => {
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `📋 **Order Summary**\n\n**Today's Orders:**\n• 15 new orders (TZS 340,000)\n• 12 fulfilled orders\n• 3 pending fulfillment\n\n**Active Prescriptions:**\n• 8 ready for pickup\n• 5 in preparation\n• 2 awaiting doctor confirmation\n\n**Recent Activity:**\n• Customer #1245 - Diabetes kit pickup\n• Customer #1246 - Antibiotic prescription\n• Customer #1247 - Vitamin order delivered`,
      timestamp: new Date(),
      suggestions: ['View pending orders', 'Print pickup list', 'Contact customers', 'Update order status'],
      category: 'order'
    };
  };

  const getInvoiceGeneratorResponse = (): Message => {
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `🧾 **Quick Invoice Generator**\n\n**Sample Invoice #INV-2024-0156**\n\n**Items:**\n• Paracetamol 500mg x10 - TZS 12,000\n• Vitamin C x5 - TZS 8,500\n• Consultation fee - TZS 5,000\n\n**Subtotal:** TZS 25,500\n**Tax (18%):** TZS 4,590\n**Total:** TZS 30,090\n\n**Payment Method:** Cash\n**Status:** Paid`,
      timestamp: new Date(),
      suggestions: ['Print invoice', 'Send via SMS', 'Email to customer', 'Generate new invoice'],
      category: 'business'
    };
  };

  // Wholesale Features
  const getBulkOrderAssistantResponse = (): Message => {
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `📦 **Bulk Order Assistant**\n\n**Based on your recent orders, I recommend:**\n\n**High Priority:**\n• Paracetamol 500mg - 5,000 units (TZS 125,000)\n• Amoxicillin 250mg - 2,000 units (TZS 90,000)\n\n**Medium Priority:**\n• Vitamin supplements - 3,000 units (TZS 45,000)\n• Cough medications - 1,500 units (TZS 60,000)\n\n**Bulk Discount Available:**\n• Orders >TZS 300,000 get 8% discount\n• Free delivery for orders >TZS 500,000`,
      timestamp: new Date(),
      suggestions: ['Create purchase order', 'View supplier catalogs', 'Check bulk discounts', 'Schedule delivery'],
      category: 'business'
    };
  };

  const getProfitabilityResponse = (): Message => {
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `💰 **Profitability Snapshot**\n\n**This Month's Performance:**\n• Total Revenue: TZS 12,500,000\n• Cost of Goods: TZS 8,750,000\n• Gross Profit: TZS 3,750,000\n• Profit Margin: 30%\n\n**Top Profit Generators:**\n1. Generic medications (42% margin)\n2. Vitamins & supplements (38% margin)\n3. Health devices (35% margin)\n\n**Improvement Opportunities:**\n• Increase generic substitution rate\n• Optimize pricing on slow-moving items`,
      timestamp: new Date(),
      suggestions: ['Detailed P&L report', 'Product profitability', 'Cost optimization', 'Pricing strategy'],
      category: 'business'
    };
  };

  // Lab Features
  const getTestRoutingResponse = (symptoms: string): Message => {
    const testRecommendations = {
      'diabetes': ['HbA1c', 'Fasting Blood Glucose', 'Random Blood Sugar'],
      'heart': ['Lipid Profile', 'ECG', 'Cardiac Enzymes'],
      'kidney': ['Creatinine', 'BUN', 'Urinalysis'],
      'liver': ['ALT', 'AST', 'Bilirubin'],
      'infection': ['Complete Blood Count', 'ESR', 'CRP']
    };

    const symptomKey = Object.keys(testRecommendations).find(key => 
      symptoms.toLowerCase().includes(key)
    );

    const tests = symptomKey ? testRecommendations[symptomKey as keyof typeof testRecommendations] : 
      ['Complete Blood Count', 'Basic Metabolic Panel', 'Urinalysis'];

    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `🔬 **Smart Test Routing**\n\nBased on the symptoms mentioned, I recommend:\n\n**Primary Tests:**\n${tests.map(test => `• ${test}`).join('\n')}\n\n**Available Slots:**\n• Today 2:00 PM - 4:00 PM\n• Tomorrow 9:00 AM - 11:00 AM\n• Saturday 10:00 AM - 12:00 PM\n\n💰 **Package Price:** TZS 45,000\n⏱️ **Results Ready:** 24-48 hours`,
      timestamp: new Date(),
      suggestions: ['Book appointment', 'Add more tests', 'View test details', 'Check insurance coverage'],
      category: 'lab'
    };
  };

  const getAppointmentManagerResponse = (): Message => {
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `📅 **Appointment Manager**\n\n**Today's Schedule:**\n• 9:00 AM - John Doe (Blood test)\n• 10:30 AM - Mary Smith (X-ray)\n• 2:00 PM - Available slot\n• 3:30 PM - Peter Johnson (ECG)\n\n**Upcoming:**\n• Tomorrow: 12 appointments\n• This week: 68 appointments\n\n**Quick Actions Available:**\n• Reschedule appointments\n• Send reminder messages\n• Update test results`,
      timestamp: new Date(),
      suggestions: ['View full schedule', 'Send reminders', 'Block time slots', 'Generate reports'],
      category: 'appointment'
    };
  };

  const getReferralGeneratorResponse = (): Message => {
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `📄 **Medical Referral Generator**\n\n**Sample Referral Letter**\n\nPatient: John Doe (ID: 12345)\nDate: ${new Date().toLocaleDateString()}\n\n**Test Results Summary:**\n• Blood Glucose: 180 mg/dL (High)\n• HbA1c: 8.2% (Elevated)\n\n**Recommendation:**\nRefer to Endocrinologist for diabetes management and treatment optimization.\n\n**Urgency:** Routine (within 2 weeks)\n**Additional Notes:** Patient requires dietary counseling`,
      timestamp: new Date(),
      suggestions: ['Print referral', 'Send to doctor', 'Schedule follow-up', 'Generate another'],
      category: 'lab'
    };
  };

  const getSymptomCheckResponse = (symptoms: string): Message => {
    const commonSymptoms = {
      'fever': {
        advice: 'Fever can indicate infection. Monitor temperature, stay hydrated, and rest. Seek medical attention if fever exceeds 39°C (102°F) or persists.',
        urgency: 'moderate',
        suggestions: ['Find nearby pharmacies', 'Consult a doctor', 'Medicine for fever']
      },
      'headache': {
        advice: 'Headaches can have various causes. Ensure adequate hydration, rest in a quiet environment. Persistent or severe headaches warrant medical consultation.',
        urgency: 'low',
        suggestions: ['Pain relief medicines', 'Relaxation techniques', 'When to see a doctor']
      },
      'cough': {
        advice: 'Coughs can be due to infections, allergies, or other conditions. Stay hydrated, consider honey for throat soothing. Persistent cough needs medical evaluation.',
        urgency: 'moderate',
        suggestions: ['Cough medicines', 'Home remedies', 'Chest X-ray locations']
      },
      'chest pain': {
        advice: '⚠️ Chest pain can be serious. If you experience severe chest pain, difficulty breathing, or pain radiating to arms/jaw, seek immediate medical attention.',
        urgency: 'high',
        suggestions: ['Find emergency services', 'Call ambulance', 'Nearest hospital']
      }
    };

    const symptomKey = Object.keys(commonSymptoms).find(key => 
      symptoms.toLowerCase().includes(key)
    );

    if (symptomKey) {
      const symptomInfo = commonSymptoms[symptomKey as keyof typeof commonSymptoms];
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `🩺 **Symptom Assessment: ${symptomKey.charAt(0).toUpperCase() + symptomKey.slice(1)}**\n\n${symptomInfo.advice}\n\n⚠️ **Important**: This is general guidance only. Always consult healthcare professionals for proper diagnosis and treatment.`,
        timestamp: new Date(),
        suggestions: symptomInfo.suggestions,
        category: 'symptom'
      };
    }

    return {
      id: Date.now().toString(),
      type: 'bot',
      content: '🩺 I understand you\'re experiencing symptoms. While I can provide general guidance, it\'s important to consult with healthcare professionals for proper diagnosis. Would you like me to help you find nearby healthcare providers or pharmacies?',
      timestamp: new Date(),
      suggestions: ['Find nearby doctors', 'Locate pharmacies', 'Emergency services', 'Book lab tests'],
      category: 'symptom'
    };
  };

  const getLabResultInterpretation = (query: string): Message => {
    const labTests = {
      'blood glucose': {
        normal: 'Normal fasting glucose: 70-99 mg/dL',
        interpretation: 'Blood glucose levels indicate how well your body processes sugar. Elevated levels may suggest diabetes risk.',
        ranges: 'Normal: <100 mg/dL | Prediabetes: 100-125 mg/dL | Diabetes: ≥126 mg/dL'
      },
      'cholesterol': {
        normal: 'Total cholesterol should be <200 mg/dL',
        interpretation: 'Cholesterol levels help assess cardiovascular risk. Higher levels may require dietary changes or medication.',
        ranges: 'Desirable: <200 mg/dL | Borderline: 200-239 mg/dL | High: ≥240 mg/dL'
      },
      'hemoglobin': {
        normal: 'Normal Hb: Men 13.5-17.5 g/dL, Women 12.0-15.5 g/dL',
        interpretation: 'Hemoglobin carries oxygen in your blood. Low levels may indicate anemia.',
        ranges: 'Low: <12 g/dL (women), <13.5 g/dL (men) | Normal: See above | High: >15.5 g/dL (women), >17.5 g/dL (men)'
      }
    };

    const testKey = Object.keys(labTests).find(key => 
      query.toLowerCase().includes(key)
    );

    if (testKey) {
      const test = labTests[testKey as keyof typeof labTests];
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `🔬 **Lab Result Interpretation: ${testKey.charAt(0).toUpperCase() + testKey.slice(1)}**\n\n**Normal Range**: ${test.normal}\n\n**What it means**: ${test.interpretation}\n\n**Reference Ranges**: ${test.ranges}\n\n⚠️ **Note**: Always discuss results with your healthcare provider for personalized interpretation.`,
        timestamp: new Date(),
        suggestions: ['Book follow-up test', 'Find specialist', 'Lifestyle recommendations', 'More lab tests'],
        category: 'lab'
      };
    }

    return {
      id: Date.now().toString(),
      type: 'bot',
      content: '🔬 I can help interpret common lab test results including blood glucose, cholesterol, hemoglobin, liver function, and more. Please specify which test result you\'d like me to explain, or upload your lab report for detailed interpretation.',
      timestamp: new Date(),
      suggestions: ['Blood glucose', 'Cholesterol levels', 'Complete blood count', 'Liver function'],
      category: 'lab'
    };
  };

  // Language detection helper
  const detectLanguage = (text: string): Lang => {
    const swahiliWords = ['nina', 'mimi', 'wewe', 'sisi', 'wao', 'hujambo', 'habari', 'asante', 'karibu', 'samahani', 'tafadhali'];
    const lower = text.toLowerCase();
    const hasSwahili = swahiliWords.some(word => lower.includes(word));
    return hasSwahili ? 'sw' : 'en';
  };

  // Main bot response function using care orchestrator
  // For pharmacy/wholesale users: Only uses RAG/STG database (no general LLM)
  const getBotResponse = async (message: string): Promise<Omit<Message, 'id' | 'timestamp'>> => {
    try {
      // Detect language and route through care orchestrator
      const lang: Lang = langPref === 'auto' ? detectLanguage(message) : (langPref as Lang);
      const input: OrchestratorInput = { 
        text: message, 
        lang,
        sessionId: user?.id || 'anonymous',
        userId: user?.id,
        userRole: user?.role // Pass user role to orchestrator for RAG-only routing
      };
      
      const response = await route(input);
      
      return {
        type: 'bot',
        content: response.content,
        suggestions: response.suggestions,
        category: response.category === 'safety' ? 'medical' : 
                 response.category === 'education' ? 'medical' : 
                 response.category === 'medical' ? 'medical' : 'general'
      };
    } catch (error) {
      console.error('Error getting bot response:', error);
      
      // Fallback response
      const lang: Lang = langPref === 'auto' ? detectLanguage(message) : (langPref as Lang);
      return {
        type: 'bot',
        content: lang === 'sw' 
          ? 'Samahani, kuna tatizo. Jaribu tena baadaye au zungumza na mshauri.'
          : 'Sorry, there was an error. Please try again later or talk to a counselor.',
        suggestions: ['Try again', 'Talk to a counselor'],
        category: 'general'
      };
    }
  };

  const handleSendMessage = async (content?: string) => {
    const message = content || inputValue;
    if (!message.trim() || isTyping) return;
    
    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    
    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    if (!content) setInputValue('');
    setIsTyping(true);
    
    try {
      // Get bot response directly - let therapeutic AI handle all inputs including greetings
      const botResponse = await getBotResponse(message);
      const botMessage: Message = {
        ...botResponse,
        id: (Date.now() + 1).toString(),
        timestamp: new Date()
      };
      
      // Add bot response to chat
      setMessages(prev => [...prev, botMessage]);
      
      // Schedule follow-up for certain topics
      if (botResponse.category === 'medication' || botResponse.category === 'symptom') {
        const followUpMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'bot',
          content: `💭 Just checking - do you need any additional help with ${botResponse.category === 'medication' ? 'your medications' : 'your symptoms'}? I'm here if you have more questions!`,
          timestamp: new Date(),
          suggestions: ['I\'m all set', 'Yes, I have questions', 'Schedule reminder'],
          category: 'general',
          isFollowUp: true
        };
        
        setTimeout(() => {
          setMessages(prev => [...prev, followUpMessage]);
        }, 30000);
      }
      
      // Update conversation context
      const lowerMessage = message.toLowerCase();
      setConversationContext(prev => ({
        ...prev,
        lastTopic: lowerMessage.includes('medication') ? 'medication' :
                  lowerMessage.includes('symptom') ? 'symptom' :
                  lowerMessage.includes('inventory') ? 'inventory' : 'general'
      }));
      
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'I apologize, but I encountered an error processing your message. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'medical':
      case 'symptom':
        return <Stethoscope className="h-4 w-4" />;
      case 'business':
        return <TrendingUp className="h-4 w-4" />;
      case 'lab':
        return <FileText className="h-4 w-4" />;
      case 'medication':
        return <Pill className="h-4 w-4" />;
      case 'inventory':
        return <Calculator className="h-4 w-4" />;
      case 'order':
        return <Users className="h-4 w-4" />;
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
        <div className="absolute -top-3 -right-1 bg-orange-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
          <HelpCircle className="h-3 w-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[90vw]">
      <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-t-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Bot className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Bepawa Care</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white/10 rounded-md overflow-hidden text-xs">
                <button
                  className={`px-2 py-1 ${langPref==='auto' ? 'bg-white/20' : ''}`}
                  onClick={() => setLangPref('auto')}
                  title="Auto"
                >Auto</button>
                <button
                  className={`px-2 py-1 ${langPref==='en' ? 'bg-white/20' : ''}`}
                  onClick={() => setLangPref('en')}
                  title="English"
                >EN</button>
                <button
                  className={`px-2 py-1 ${langPref==='sw' ? 'bg-white/20' : ''}`}
                  onClick={() => setLangPref('sw')}
                  title="Kiswahili"
                >SW</button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Quick Actions - Individual (Bepawa Care Lite) */}
          {user?.role === 'individual' && (
            <div className="px-4 pt-4 pb-2 border-b bg-white/60 backdrop-blur space-y-2">
              <div className="flex flex-wrap gap-2">
                {['Stress self-check', 'Anxiety scale', 'HIV stigma support', 'Breathing exercise'].map((q) => (
                  <Badge
                    key={q}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-green-50 hover:border-green-300"
                    onClick={() => handleSendMessage(q)}
                  >
                    {q}
                  </Badge>
                ))}
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-1">Explore topics</p>
                <div className="flex flex-wrap gap-2">
                  {['Stress','Anxiety','Depression','Relationships','Sleep','Trauma','Grief','Financial stress','Substance','Postpartum','HIV stigma'].map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                      onClick={() => handleSendMessage(t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <ScrollArea className="h-80 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                    <div className={`p-2 rounded-full ${message.type === 'user' ? 'bg-primary-100 ml-2' : 'bg-gray-100 mr-2'}`}>
                      {message.type === 'user' ? (
                        <User className="h-4 w-4 text-primary-600" />
                      ) : (
                        getCategoryIcon(message.category)
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className={`p-3 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-primary-600 text-white' 
                          : message.category === 'symptom' 
                          ? 'bg-red-50 text-red-900 border border-red-200'
                          : message.category === 'business' || message.category === 'inventory'
                          ? 'bg-blue-50 text-blue-900 border border-blue-200'
                          : message.category === 'lab' || message.category === 'appointment'
                          ? 'bg-purple-50 text-purple-900 border border-purple-200'
                          : message.category === 'medication'
                          ? 'bg-green-50 text-green-900 border border-green-200'
                          : message.isFollowUp
                          ? 'bg-yellow-50 text-yellow-900 border border-yellow-200'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                      </div>
                      {message.suggestions && (
                        <div className="flex flex-wrap gap-1">
                          {message.suggestions.map((suggestion, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-primary-50 hover:border-primary-300 transition-colors"
                              onClick={() => handleSendMessage(suggestion)}
                            >
                              {suggestion}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex items-start space-x-2">
                  <div className="bg-gray-100 p-2 rounded-full mr-2">
                    <Bot className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>
          
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  user?.role === 'individual' ? "Track meds, check symptoms, find services..." :
                  user?.role === 'retail' ? "Inventory insights, orders, invoices..." :
                  user?.role === 'wholesale' ? "Bulk orders, profits, distribution..." :
                  user?.role === 'lab' ? "Test routing, appointments, referrals..." :
                  "Ask me anything about BEPAWA..."
                }
                className="flex-1 border-gray-200 focus:border-primary-500 focus:ring-primary-500"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isTyping}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Enhanced AI assistant with role-specific features • Always consult professionals for medical decisions
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatBot;
