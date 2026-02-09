import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Convert a Tanzanian local number to E.164 */
function toE164(phone: string): string {
  if (!phone) return "";
  // Strip whitespace, dashes, dots
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, "");
  // Already E.164
  if (cleaned.startsWith("+")) return cleaned;
  // Starts with 0 → Tanzania
  if (cleaned.startsWith("0")) {
    return "+255" + cleaned.slice(1);
  }
  // Starts with 255 without +
  if (cleaned.startsWith("255")) {
    return "+" + cleaned;
  }
  // Fallback: assume Tanzania
  return "+255" + cleaned;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, event_type, order_id } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' or 'message'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ error: "Twilio not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formattedPhone = toE164(to);

    // Log the attempt
    const { data: logEntry } = await supabase
      .from("sms_logs")
      .insert({
        recipient_phone: formattedPhone,
        message_body: message,
        event_type: event_type || "unknown",
        order_id: order_id || null,
        status: "pending",
      })
      .select("id")
      .single();

    const logId = logEntry?.id;

    // Send via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const body = new URLSearchParams({
      To: formattedPhone,
      From: TWILIO_PHONE_NUMBER,
      Body: message,
    });

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (twilioResponse.ok) {
      // Update log with success
      if (logId) {
        await supabase
          .from("sms_logs")
          .update({ status: "sent", twilio_sid: twilioData.sid })
          .eq("id", logId);
      }

      console.log(`SMS sent to ${formattedPhone} | SID: ${twilioData.sid}`);
      return new Response(
        JSON.stringify({ success: true, sid: twilioData.sid }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Update log with failure
      const errorMsg = twilioData.message || "Unknown Twilio error";
      if (logId) {
        await supabase
          .from("sms_logs")
          .update({ status: "failed", error_message: errorMsg })
          .eq("id", logId);
      }

      console.error(`SMS failed to ${formattedPhone}: ${errorMsg}`);
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("send-sms error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
