// Supabase Edge Function: knowledge-search
// Keyword/topic-based text matching for care_knowledge table.
// Falls back to text search when embeddings aren't available.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReqBody {
  query: string;
  lang?: 'en' | 'sw';
  topic?: string;
  topK?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
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
    const topK = body.topK ?? 3;

    // Build keyword search query using ilike on chunk_text and title
    const keywords = query.split(/\s+/).filter(w => w.length > 2);
    
    // Try topic match first
    let filterParts: string[] = [];
    if (body.topic) {
      filterParts.push(`topic=eq.${encodeURIComponent(body.topic)}`);
    }
    if (body.lang) {
      filterParts.push(`lang=eq.${body.lang}`);
    }

    // Build the REST query - use full-text search via ilike
    const searchTerms = keywords.map(k => `chunk_text.ilike.*${encodeURIComponent(k)}*`).join(',');
    const titleTerms = keywords.map(k => `title.ilike.*${encodeURIComponent(k)}*`).join(',');
    
    let restUrl = `${url}/rest/v1/care_knowledge?select=id,topic,lang,title,chunk_text&limit=${topK}`;
    
    if (filterParts.length > 0) {
      restUrl += `&${filterParts.join('&')}`;
    }
    
    // Search with OR across chunk_text and title keywords
    if (keywords.length > 0) {
      restUrl += `&or=(${searchTerms},${titleTerms})`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    };

    let res = await fetch(restUrl, { headers });
    let rows = await res.json();

    // If no results with AND-like matching, try individual keyword matching
    if ((!rows || rows.length === 0) && keywords.length > 1) {
      // Try each keyword individually and collect results
      const allResults: any[] = [];
      for (const keyword of keywords.slice(0, 3)) {
        let fallbackUrl = `${url}/rest/v1/care_knowledge?select=id,topic,lang,title,chunk_text&limit=${topK}`;
        if (body.lang) fallbackUrl += `&lang=eq.${body.lang}`;
        fallbackUrl += `&or=(chunk_text.ilike.*${encodeURIComponent(keyword)}*,title.ilike.*${encodeURIComponent(keyword)}*,topic.ilike.*${encodeURIComponent(keyword)}*)`;
        
        const r = await fetch(fallbackUrl, { headers });
        const data = await r.json();
        if (Array.isArray(data)) allResults.push(...data);
      }
      
      // Deduplicate by id
      const seen = new Set<string>();
      rows = allResults.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      }).slice(0, topK);
    }

    // Final fallback: if still no results, try topic-based search
    if ((!rows || rows.length === 0) && !body.topic) {
      let topicUrl = `${url}/rest/v1/care_knowledge?select=id,topic,lang,title,chunk_text&limit=${topK}`;
      if (body.lang) topicUrl += `&lang=eq.${body.lang}`;
      topicUrl += `&or=(topic.ilike.*${encodeURIComponent(query)}*)`;
      
      const r = await fetch(topicUrl, { headers });
      rows = await r.json();
    }

    return new Response(JSON.stringify({ results: Array.isArray(rows) ? rows : [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(`Server error: ${e}`, { status: 500, headers: corsHeaders });
  }
});
