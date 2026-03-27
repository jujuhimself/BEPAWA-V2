// Supabase Edge Function: knowledge-search
// Text-based search for care_knowledge entries (no embeddings needed)
// Falls back to keyword/topic matching for reliable retrieval

declare const Deno: any;

interface ReqBody {
  query: string;
  lang?: 'en' | 'sw';
  topic?: string;
  topK?: number;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    const body = (await req.json()) as ReqBody;
    if (!body?.query) return new Response('Bad Request', { status: 400, headers: corsHeaders });

    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return new Response('Server config missing', { status: 500, headers: corsHeaders });

    const query = body.query.toLowerCase().trim();
    const topK = body.topK ?? 5;

    // Determine relevant topics from query keywords
    const topicMap: Record<string, string[]> = {
      'hiv_basics': ['hiv', 'vvu', 'aids', 'ukimwi', 'virus', 'immune', 'cd4', 'art', 'antiretroviral', 'undetectable', 'u=u', 'transmitted', 'spread', 'tested', 'testing', 'kupimwa'],
      'pep_guidance': ['pep', 'post-exposure', 'post exposure', 'exposure', 'condom broke', 'unprotected', '72 hours', 'emergency', 'needle stick', 'sexual assault', 'baada ya kuambukizwa', 'nimefanya ngono'],
      'prep_guidance': ['prep', 'pre-exposure', 'pre exposure', 'prevention', 'daily pill', 'prevent hiv', 'before exposure', 'kabla ya kuambukizwa', 'kinga'],
      'hiv_self_testing': ['self-test', 'self test', 'selftest', 'test kit', 'home test', 'oral swab', 'finger prick', 'kupima nyumbani', 'kit', 'result', 'reactive', 'non-reactive'],
      'stigma_support': ['stigma', 'discrimination', 'shame', 'disclosure', 'afraid', 'scared', 'support', 'mental', 'emotional', 'counselor', 'unyanyapaa', 'aibu', 'hofu'],
      'bepawaa_services': ['bepawa', 'order', 'pharmacy', 'delivery', 'cod', 'cash on delivery', 'book', 'appointment', 'service', 'huduma'],
      'hiv_faqs': ['faq', 'question', 'cure', 'kissing', 'children', 'pregnant', 'side effect', 'confidential'],
    };

    // Score topics by keyword matches
    const topicScores: Record<string, number> = {};
    for (const [topic, keywords] of Object.entries(topicMap)) {
      let score = 0;
      for (const kw of keywords) {
        if (query.includes(kw)) score += kw.length; // longer matches score higher
      }
      if (score > 0) topicScores[topic] = score;
    }

    // If a specific topic was requested, prioritize it
    if (body.topic) {
      topicScores[body.topic] = (topicScores[body.topic] || 0) + 100;
    }

    // Build the query - use ilike for text search
    const searchWords = query.split(/\s+/).filter(w => w.length > 2).slice(0, 5);
    
    // Construct OR filter for text search
    let filterParts: string[] = [];
    for (const word of searchWords) {
      filterParts.push(`chunk_text.ilike.*${encodeURIComponent(word)}*`);
    }

    // Also filter by detected topics
    const detectedTopics = Object.entries(topicScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);

    let queryUrl: string;
    const headers: Record<string, string> = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    if (detectedTopics.length > 0) {
      // Search by topic match first
      const topicFilter = `topic=in.(${detectedTopics.join(',')})`;
      const langFilter = body.lang ? `&lang=eq.${body.lang}` : '';
      queryUrl = `${url}/rest/v1/care_knowledge?${topicFilter}${langFilter}&select=id,topic,lang,title,chunk_text&limit=${topK}`;
    } else if (filterParts.length > 0) {
      // Fallback to text search
      const langFilter = body.lang ? `&lang=eq.${body.lang}` : '';
      queryUrl = `${url}/rest/v1/care_knowledge?or=(${filterParts.join(',')})${langFilter}&select=id,topic,lang,title,chunk_text&limit=${topK}`;
    } else {
      // No good match — return all topics
      const langFilter = body.lang ? `lang=eq.${body.lang}&` : '';
      queryUrl = `${url}/rest/v1/care_knowledge?${langFilter}select=id,topic,lang,title,chunk_text&limit=${topK}`;
    }

    const res = await fetch(queryUrl, { headers });
    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: `Query error: ${errText}` }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const rows = await res.json();

    // Sort results by relevance (simple word overlap scoring)
    const scored = rows.map((row: any) => {
      const text = row.chunk_text.toLowerCase();
      let score = 0;
      for (const word of searchWords) {
        const regex = new RegExp(word, 'gi');
        const matches = text.match(regex);
        if (matches) score += matches.length * word.length;
      }
      // Boost by topic match
      if (detectedTopics.includes(row.topic)) {
        score += (topicScores[row.topic] || 0) * 2;
      }
      return { ...row, relevance_score: score };
    }).sort((a: any, b: any) => b.relevance_score - a.relevance_score);

    return new Response(JSON.stringify({ results: scored.slice(0, topK) }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Server error: ${e}` }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
