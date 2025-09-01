import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// These secrets are automatically set by Supabase
const OPENAI_API_BASE_URL = Deno.env.get("OPENAI_API_BASE_URL")
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
const VISION_MODEL_NAME = Deno.env.get("VISION_MODEL_NAME")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { messages } = await req.json()

    if (!messages) {
      return new Response(JSON.stringify({ error: "messages is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const payload = {
      model: VISION_MODEL_NAME,
      messages: messages,
      temperature: 0.7,
      max_tokens: 300,
      stream: false,
    }

    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OPENAI_API_KEY && { 'Authorization': `Bearer ${OPENAI_API_KEY}` })
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})