// Orchestrator for Bepawa Care - now uses therapeutic-chat edge function with LLM
// For pharmacy/wholesale users: RAG/STG only (no general LLM)
import { supabase } from '@/integrations/supabase/client';
import { findGuidelines } from '@/data/treatmentGuidelines';

export type Lang = 'en' | 'sw';

export interface OrchestratorInput {
  text: string;
  lang: Lang;
  sessionId?: string;
  userId?: string;
  userRole?: string; // 'individual' | 'retail' | 'wholesale' | 'lab' | 'admin'
}

export interface OrchestratorMessage {
  type: 'bot';
  content: string;
  suggestions?: string[];
  category?: 'general' | 'safety' | 'education' | 'medical';
}

// Roles that should only use RAG/STG (no general LLM)
const RAG_ONLY_ROLES = ['retail', 'wholesale'];

/**
 * For pharmacy/wholesale users: Search local STG database only
 * Returns treatment guidelines without calling external LLM
 */
async function getRAGOnlyResponse(input: OrchestratorInput): Promise<OrchestratorMessage> {
  const { text, lang } = input;
  const lowerText = text.toLowerCase();

  // Try to find matching treatment guidelines
  const guidelines = findGuidelines(text);

  if (guidelines.length > 0) {
    // Format the guidelines response
    const formatted = guidelines.map(g => {
      const first = g.firstLine.map(fl => 
        `• ${fl.medication} – ${fl.dosage} for ${fl.duration}${fl.notes ? ` (${fl.notes})` : ''}`
      ).join('\n');
      
      const second = g.secondLine && g.secondLine.length 
        ? `\n\n**Second-line:**\n${g.secondLine.map(sl => 
            `• ${sl.medication} – ${sl.dosage} for ${sl.duration}${sl.notes ? ` (${sl.notes})` : ''}`
          ).join('\n')}` 
        : '';
      
      return `### ${g.condition}\n\n**First-line:**\n${first}${second}\n\n**Precautions:** ${g.precautions.join(', ')}\n**Refer if:** ${g.whenToRefer.join(', ')}\n**Counseling:** ${g.patientCounseling.join(', ')}`;
    }).join('\n\n---\n\n');

    return {
      type: 'bot',
      content: formatted,
      suggestions: ['More guidelines', 'Dosage calculator', 'Drug interactions'],
      category: 'medical'
    };
  }

  // Try RAG search from care_knowledge table
  try {
    const { data, error } = await supabase.functions.invoke('knowledge-search', {
      body: { query: text, lang, topK: 3 }
    });

    if (!error && data?.results?.length > 0) {
      const results = data.results;
      const content = results.map((r: any) => r.chunk_text).join('\n\n');
      
      return {
        type: 'bot',
        content: `📚 **From Treatment Guidelines:**\n\n${content}`,
        suggestions: ['List available guidelines', 'Dosage calculator', 'More information'],
        category: 'medical'
      };
    }
  } catch (err) {
    console.warn('Knowledge search error:', err);
  }

  // Default response when no STG/RAG match found
  const helpText = lang === 'sw'
    ? `Samahani, sikupata mwongozo wa matibabu kwa "${text}". Jaribu kutafuta hali nyingine au dawa.\n\n**Mifano ya utafutaji:**\n• "Malaria treatment"\n• "Amoxicillin dosage"\n• "Hypertension guidelines"`
    : `I couldn't find a treatment guideline for "${text}". Try searching for a specific condition or medication.\n\n**Example searches:**\n• "Malaria treatment"\n• "Amoxicillin dosage"\n• "Hypertension guidelines"`;

  return {
    type: 'bot',
    content: helpText,
    suggestions: ['List available guidelines', 'Malaria treatment', 'Dosage calculator'],
    category: 'medical'
  };
}

export async function route(input: OrchestratorInput): Promise<OrchestratorMessage> {
  const { text, lang, sessionId, userId, userRole } = input;

  // For pharmacy/wholesale users: Use RAG/STG only (no general LLM)
  if (userRole && RAG_ONLY_ROLES.includes(userRole)) {
    return getRAGOnlyResponse(input);
  }

  try {
    // Call the enhanced therapeutic-chat edge function for other users
    const { data, error } = await supabase.functions.invoke('therapeutic-chat', {
      body: {
        message: text,
        language: lang,
        sessionId: sessionId || 'web-session',
        userId: userId || null,
        channel: 'web'
      }
    });

    if (error) {
      console.error('Therapeutic chat error:', error);
      throw error;
    }

    return {
      type: 'bot',
      content: data.content || 'I\'m here to help. Can you tell me more?',
      suggestions: data.suggestions || ['Tell me more', 'Coping strategies', 'Talk to a counselor'],
      category: data.priority === 'crisis' ? 'safety' : 'general'
    };
  } catch (error) {
    console.error('Error calling therapeutic chat:', error);
    
    // Fallback response
    const content = lang === 'sw'
      ? 'Samahani, nina tatizo la teknologia. Je, unaweza kuniambia kidogo unajisikiaje sasa?'
      : 'I\'m having a technical issue. Can you briefly tell me how you\'re feeling right now?';
    
    return {
      type: 'bot',
      content,
      suggestions: ['Tell me more', 'Talk to a counselor'],
      category: 'general'
    };
  }
}
