export const environment = {
  production: false,
  
  // Specialized services
  ttsApiEndpoint: "http://api.blacknation.io:4123",
  ttsApiKey: "111111",

  suggestionsApiEndpoint: "https://your-suggestions-agent.com/generate",
  suggestionsApiKey: "your_suggestions_api_key_here",
  metadataApiEndpoint: "https://your-metadata-scraper.com/fetch",
  metadataApiKey: "your_metadata_api_key_here",
  
  // OpenAI-like service config
  openaiApiBaseUrl: "http://api.blacknation.io:8189",
  openaiApiKey: "111111",
  chatModelName: "rstar-coder-qwen3-0.6b@bf16",
  embeddingModelName: "fatboy-embeddings-v4-text-retrieval",
  visionModelName: "Moonbeam2",

  // Barcode Lookup
  barcodeLookupApiKey: "nkg2i7b01p0xnu16igpuvq3rjy2mik",

  // NATURALYTE private gateway / zero-trust settings
  // If you host a gateway inside Tailscale (or fronted by Cloudflare Tunnel), set it here.
  // Example: "https://gateway.naturalyte.internal" or a Cloudflare domain protected by Access.
  tailscaleGatewayBaseUrl: "",

  // Optional Cloudflare Access service token headers for calls to trustedHosts or tailscaleGatewayBaseUrl
  cloudflareAccess: {
    clientId: "",     // e.g. CF_ACCESS_CLIENT_ID
    clientSecret: ""  // e.g. CF_ACCESS_CLIENT_SECRET
  },

  // Which hosts should receive CF-Access headers automatically (in addition to tailscaleGatewayBaseUrl)
  trustedHosts: []
};