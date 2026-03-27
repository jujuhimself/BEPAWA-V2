// Enhanced knowledge ingestion script to load all care content into vector database
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// You'll need to set these environment variables or replace with actual values
const SUPABASE_URL = 'https://frgblvloxhcnwrgvjazk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-key-here';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small'
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function chunkText(text: string, maxLength = 800): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
}

function extractTopic(filePath: string): string {
  const pathParts = filePath.split('/');
  if (pathParts.includes('anxiety')) return 'anxiety';
  if (pathParts.includes('depression')) return 'depression';
  if (pathParts.includes('stress')) return 'stress';
  if (pathParts.includes('hiv_stigma')) return 'hiv_stigma';
  if (pathParts.includes('relationships')) return 'relationships';
  if (pathParts.includes('trauma')) return 'trauma';
  if (pathParts.includes('sleep')) return 'sleep';
  if (pathParts.includes('grief')) return 'grief';
  if (pathParts.includes('substance')) return 'substance';
  if (pathParts.includes('postpartum')) return 'postpartum';
  // HIV knowledge topics
  if (filePath.includes('hiv_basics') || filePath.includes('hiv/')) {
    if (filePath.includes('pep')) return 'pep_guidance';
    if (filePath.includes('prep')) return 'prep_guidance';
    if (filePath.includes('self_test')) return 'hiv_self_testing';
    if (filePath.includes('stigma')) return 'stigma_support';
    if (filePath.includes('bepawaa') || filePath.includes('services')) return 'bepawaa_services';
    if (filePath.includes('faq')) return 'hiv_faqs';
    return 'hiv_basics';
  }
  return 'general';
}

function extractLanguage(filePath: string): 'en' | 'sw' {
  return filePath.includes('/sw/') ? 'sw' : 'en';
}

function extractTitle(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.replace('# ', '').trim();
    }
  }
  return 'Untitled';
}

async function processDirectory(dirPath: string): Promise<void> {
  console.log(`Processing directory: ${dirPath}`);
  
  const entries = readdirSync(dirPath);
  
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.endsWith('.md')) {
      await processMarkdownFile(fullPath);
    }
  }
}

async function processMarkdownFile(filePath: string): Promise<void> {
  try {
    console.log(`Processing file: ${filePath}`);
    
    const content = readFileSync(filePath, 'utf-8');
    const topic = extractTopic(filePath);
    const language = extractLanguage(filePath);
    const title = extractTitle(content);
    
    // Clean content - remove markdown headers and source notes
    const cleanContent = content
      .replace(/^#+ /gm, '') // Remove markdown headers
      .replace(/Source notes:.*$/gm, '') // Remove source notes
      .replace(/---.*$/gm, '') // Remove separators
      .replace(/^\s*$/gm, '') // Remove empty lines
      .trim();
    
    if (cleanContent.length < 100) {
      console.log(`Skipping ${filePath} - content too short`);
      return;
    }
    
    // Chunk the content for better retrieval
    const chunks = chunkText(cleanContent);
    console.log(`Created ${chunks.length} chunks for ${filePath}`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding
      console.log(`Generating embedding for chunk ${i + 1}/${chunks.length}`);
      const embedding = await generateEmbedding(chunk);
      
      // Insert into database
      const { error } = await supabase
        .from('care_knowledge')
        .upsert({
          topic,
          lang: language,
          title: chunks.length > 1 ? `${title} (Part ${i + 1})` : title,
          chunk_text: chunk,
          source_url: filePath,
          embedding: embedding
        });
      
      if (error) {
        console.error(`Error inserting chunk: ${error.message}`);
      } else {
        console.log(`✅ Inserted chunk ${i + 1}/${chunks.length} for ${topic} (${language})`);
      }
      
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Additional therapeutic content to supplement existing files
const additionalContent = [
  {
    topic: 'anxiety',
    lang: 'sw',
    title: 'Njia za Kupunguza Wasiwasi',
    content: `Wasiwasi ni hali ya kawaida ya kimwili na kihisia. Hapa kuna baadhi ya njia za kupunguza wasiwasi:

**Kupumua kwa Utulivu:**
- Pumua ndani kwa hesabu 4
- Shika pumzi kwa hesabu 4  
- Pumua nje kwa hesabu 4
- Rudia mzunguko huu mara 5-10

**Mbinu za 5-4-3-2-1:**
- Taja vitu 5 unavyoviweza kuona
- Taja sauti 4 unazozisikia
- Taja vitu 3 unavyoviweza kugusa
- Taja harufu 2 unazozisikiliza
- Taja kitu 1 kinachoonja

**Mazingira ya Utulivu:**
- Tafuta mazingira ya kimya
- Ongeza mwanga wa kawaida
- Epuka caffeine
- Fanya mazoezi ya mwanga

Kumbuka: Wasiwasi unaweza kudhibitiwa. Ikiwa unaendelea kuhuzunika, tafuta ushauri wa kitaaluma.`
  },
  {
    topic: 'depression',
    lang: 'sw', 
    title: 'Kukabiliana na Huzuni Kali',
    content: `Huzuni kali ni hali ya afya ya akili ambayo inaathiri mawazo, hisia, na vitendo. Dalili ni pamoja na:

**Dalili Kuu:**
- Huzuni au ukiwa inayoendelea
- Kupoteza hamu za shughuli za kawaida
- Mabadiliko ya kulala na kula
- Uchovu mkuu au ukosefu wa nguvu
- Mawazo ya kutojali mwenyewe

**Njia za Msaada:**
- Kuwa na ratiba za kila siku
- Kujisaidia kwa mambo madogo
- Kuongea na watu wa kuaminika
- Kupata mwanga wa jua kila siku
- Kufanya mazoezi ya mwanga

**Wakati wa Kutafuta Msaada:**
- Dalili zinapomdumu kwa wiki zaidi ya mbili
- Kuna mawazo ya kujidhuru
- Kutoweza kufanya kazi za kawaida

Tafuta msaada haraka. Piga 116 au tembelea hospitali ya karibu ikiwa una hali mbaya.`
  },
  {
    topic: 'relationships',
    lang: 'en',
    title: 'Building Healthy Relationships',
    content: `Healthy relationships are built on trust, respect, and good communication. Here are key principles:

**Communication Skills:**
- Use "I" statements to express feelings
- Listen actively without interrupting
- Ask clarifying questions to understand
- Express appreciation regularly
- Address conflicts calmly and directly

**Setting Boundaries:**
- Clearly communicate your limits
- Be consistent with your boundaries
- Respect others' boundaries
- It's okay to say no
- Protect your time and energy

**Building Trust:**
- Keep your promises and commitments
- Be honest about your feelings
- Show reliability in small and big things
- Admit mistakes and apologize sincerely
- Give others the benefit of the doubt

**Managing Conflict:**
- Take breaks when emotions are high
- Focus on the specific issue, not character
- Look for compromise and solutions
- Seek to understand before being understood
- Know when to agree to disagree

**When Relationships Become Unhealthy:**
- Constant criticism or put-downs
- Controlling behavior or isolation
- Physical, emotional, or sexual abuse
- Addiction affecting the relationship
- Repeated boundary violations

Remember: You deserve respect and kindness in all relationships. Seek support if you're in an unhealthy situation.`
  }
];

async function ingestAdditionalContent(): Promise<void> {
  console.log('Ingesting additional therapeutic content...');
  
  for (const content of additionalContent) {
    try {
      const chunks = chunkText(content.content);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await generateEmbedding(chunk);
        
        const { error } = await supabase
          .from('care_knowledge')
          .upsert({
            topic: content.topic,
            lang: content.lang as 'en' | 'sw',
            title: chunks.length > 1 ? `${content.title} (Part ${i + 1})` : content.title,
            chunk_text: chunk,
            source_url: 'additional_content',
            embedding: embedding
          });
        
        if (error) {
          console.error(`Error inserting additional content: ${error.message}`);
        } else {
          console.log(`✅ Inserted ${content.title} chunk ${i + 1}/${chunks.length}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Error processing additional content:`, error);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting knowledge ingestion...');
    console.log(`Supabase URL: ${SUPABASE_URL}`);
    
    // Check if we can connect to Supabase
    const { error: testError } = await supabase.from('care_knowledge').select('count').single();
    if (testError && !testError.message.includes('No rows')) {
      throw new Error(`Cannot connect to Supabase: ${testError.message}`);
    }
    
    // Clear existing knowledge (optional - comment out to keep existing data)
    console.log('Clearing existing knowledge...');
    await supabase.from('care_knowledge').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Process markdown files in knowledge directories
    const knowledgePaths = ['./knowledge/psychoeducation', './knowledge/hiv'];
    for (const knowledgePath of knowledgePaths) {
      try {
        await processDirectory(knowledgePath);
      } catch (error) {
        console.log(`Knowledge directory not found or inaccessible: ${knowledgePath}`);
      }
    }
    
    // Ingest additional content
    await ingestAdditionalContent();
    
    // Get final count
    const { count } = await supabase
      .from('care_knowledge')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Knowledge ingestion complete! Total entries: ${count}`);
    
  } catch (error) {
    console.error('❌ Error during ingestion:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as ingestCareKnowledge };
