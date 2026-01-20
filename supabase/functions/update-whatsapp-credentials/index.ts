import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, phoneNumberId, verifyToken } = await req.json();

    if (!accessToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: "Missing required credentials" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Note: In a production environment, you would use the Supabase Management API
    // to update secrets programmatically. For now, we'll just validate the format
    // and return success. The user should update secrets through the Supabase dashboard.
    
    // Validate phone number ID format (should be numeric)
    if (!/^\d+$/.test(phoneNumberId)) {
      return new Response(
        JSON.stringify({ error: "Invalid Phone Number ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate access token format (should start with EAAG or similar)
    if (!accessToken.startsWith("EAAG") && !accessToken.startsWith("EAA")) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid Access Token format. Should start with EAAG or EAA",
          warning: "Please ensure you're using a permanent token from Meta Business Suite"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("WhatsApp credentials validated successfully");
    console.log("Phone Number ID:", phoneNumberId);
    console.log("Verify Token:", verifyToken || "bepawa_whatsapp_verify_9c4f2c5d");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Credentials validated. Please update the following Supabase secrets manually:\n" +
                 "- WHATSAPP_ACCESS_TOKEN\n" +
                 "- WHATSAPP_PHONE_NUMBER_ID\n" +
                 "- WHATSAPP_VERIFY_TOKEN (optional)",
        webhookUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`,
        verifyToken: verifyToken || "bepawa_whatsapp_verify_9c4f2c5d"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing WhatsApp credentials:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
