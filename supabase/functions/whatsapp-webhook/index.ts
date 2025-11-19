import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERIFY_TOKEN =
  Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "bepawa_whatsapp_verify_9c4f2c5d";

interface WhatsAppMessagePayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          id: string;
          timestamp?: string;
          type: string;
          text?: { body: string };
        }>;
        contacts?: Array<{
          profile?: { name?: string };
          wa_id?: string;
        }>;
      };
    }>;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token && challenge) {
        if (token === VERIFY_TOKEN) {
          return new Response(challenge, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "text/plain; charset=utf-8",
            },
          });
        }
        return new Response("Forbidden: invalid verify token", {
          status: 403,
          headers: corsHeaders,
        });
      }

      if (url.searchParams.get("ping")) {
        return new Response("ok", {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      return new Response("Bad Request", {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (req.method === "POST") {
      const body = (await req.json()) as WhatsAppMessagePayload;
      console.log("WhatsApp inbound payload:", JSON.stringify(body));

      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const messages = value?.messages || [];

      if (!messages.length) {
        return new Response(JSON.stringify({ ok: true, message: "no messages" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const message of messages) {
        if (message.type !== "text" || !message.text?.body) continue;

        const from = message.from;
        const text = message.text.body;

        const sessionId = `whatsapp:${from}`;
        const language: "en" | "sw" = "en"; // default; could be enhanced later

        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          const therapeuticUrl = `${supabaseUrl}/functions/v1/therapeutic-chat`;

          const resp = await fetch(therapeuticUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(serviceRoleKey
                ? { Authorization: `Bearer ${serviceRoleKey}` }
                : {}),
            },
            body: JSON.stringify({
              message: text,
              language,
              sessionId,
              channel: "whatsapp",
              phoneNumber: from,
              userId: null,
            }),
          });

          if (!resp.ok) {
            const t = await resp.text();
            console.error("Error calling therapeutic-chat:", resp.status, t);
          } else {
            const data = await resp.json();
            console.log("therapeutic-chat response for WhatsApp:", data);
          }
        } catch (err) {
          console.error("Error forwarding to therapeutic-chat:", err);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        ...corsHeaders,
        Allow: "GET, POST, OPTIONS",
      },
    });
  } catch (err) {
    console.error("whatsapp-webhook error:", err);
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
};

serve(handler);
