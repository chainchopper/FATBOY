export const environment = {
  production: true,

  // Nirvana - Primary AI Intelligence System
  // This is the ONLY AI provider
  nirvanaApiKey: "your_nirvana_api_key_here",
  nirvanaLiveApiEndpoint: "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent",

  // DEPRECATED: Legacy services
  // TTS is now handled by Nirvana directly
  ttsApiEndpoint: "",  // Not used
  ttsApiKey: "",       // Not used
  openaiApiBaseUrl: "",  // Not used
  openaiApiKey: "",      // Not used
  chatModelName: "",     // Not used
  embeddingModelName: "", // Not used
  visionModelName: "",    // Not used

  suggestionsApiEndpoint: "https://your-suggestions-agent.com/generate",
  suggestionsApiKey: "your_suggestions_api_key_here",
  metadataApiEndpoint: "https://your-metadata-scraper.com/fetch",
  metadataApiKey: "your_metadata_api_key_here",

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