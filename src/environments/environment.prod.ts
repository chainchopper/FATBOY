export const environment = {
  production: true,

  // Nirvana - Primary AI Intelligence System (Gemini Live API)
  geminiApiKey: "your_gemini_api_key_here",
  geminiLiveApiEndpoint: "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent",
  
  // Legacy services (being phased out)
  ttsApiEndpoint: "http://api.blacknation.io:4123",
  ttsApiKey: "111111",

  suggestionsApiEndpoint: "https://your-suggestions-agent.com/generate",
  suggestionsApiKey: "your_suggestions_api_key_here",
  metadataApiEndpoint: "https://your-metadata-scraper.com/fetch",
  metadataApiKey: "your_metadata_api_key_here",
  
  // OpenAI-like service config (deprecated - kept for backward compatibility)
  openaiApiBaseUrl: "http://api.blacknation.io:8189",
  openaiApiKey: "111111",
  chatModelName: "rstar-coder-qwen3-0.6b@bf16",
  embeddingModelName: "fatboy-embeddings-v4-text-retrieval",
  visionModelName: "Moonbeam2",

  // Barcode Lookup
  barcodeLookupApiKey: "nkg2i7b01p0xnu16igpuvq3rjy2mik",

  // NATURALYTE private gateway / zero-trust settings
  tailscaleGatewayBaseUrl: "",

  cloudflareAccess: {
    clientId: "",
    clientSecret: ""
  },

  trustedHosts: []
};