// Supabase Edge Function: knowledge-search
// Embeds a query using OpenAI and returns top care_knowledge matches via pgvector RPC.
// Secrets required:
// - OPENAI_API_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY


// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

interface ReqBody {
  query: string;
  lang?: 'en'|'sw';
  topic?: string;
  topK?: number;
}

async function embedOpenAI(text: string): Promise<number[]> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('Missing OPENAI_API_KEY');
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' })
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const body = (await req.json()) as ReqBody;
    if (!body?.query) return new Response('Bad Request', { status: 400 });

    const queryEmbedding = await embedOpenAI(body.query);

    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return new Response('Server config missing', { status: 500 });

    const rpc = new URL('/rest/v1/rpc/match_care_knowledge', url).toString();
    const res = await fetch(rpc, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      },
      body: JSON.stringify({
        query_embedding: queryEmbedding,
        match_count: body.topK ?? 3,
        match_topic: body.topic ?? null,
        match_lang: body.lang ?? null
      })
    });
    if (!res.ok) return new Response(`RPC error ${res.status}: ${await res.text()}`, { status: 500 });
    const rows = await res.json();
    return new Response(JSON.stringify({ results: rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(`Server error: ${e}`, { status: 500 });
  }
});
