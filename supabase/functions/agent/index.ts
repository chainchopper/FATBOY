import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// These secrets must be set in your Supabase project dashboard
const OPENAI_API_BASE_URL = Deno.env.get("OPENAI_API_BASE_URL")
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
const MODEL_NAME = Deno.env.get("VISION_MODEL_NAME") // We'll use this for the chat model

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
    // 1. Get the messages array from the incoming request from our app
    const { messages } = await req.json()

    if (!messages) {
      return new Response(JSON.stringify({ error: "messages is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 2. Construct the payload for the AI model, matching the curl command
    const payload = {
      model: MODEL_NAME,
      messages: messages,
      temperature: 0.7,
      max_tokens: 300, // Set a safe limit to manage resource usage
      stream: false, // The front-end is not set up for streaming
    }

    // 3. Securely call the AI model endpoint from the backend
    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OPENAI_API_KEY && { 'Authorization': `Bearer ${OPENAI_API_KEY}` })
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('AI Model API Error:', response.status, errorBody);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json()

    // 4. Return the AI's response to our app
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