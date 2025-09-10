// NOTE: The build system has been reverted to the standard Angular builder to fix compilation errors.
// Environment variables from .env are no longer automatically injected.
// You will need to manage your keys and endpoints here manually for now.

export const environment = {
  production: true,

  // Specialized services (replace with your actual values)
  ttsApiEndpoint: "http://api.blacknation.io:4123/v1/audio/speech", // Added TTS API Endpoint
  ttsApiKey: "your_tts_api_key_here",
  suggestionsApiEndpoint: "https://your-suggestions-agent.com/generate",
  suggestionsApiKey: "your_suggestions_api_key_here",
  metadataApiEndpoint: "https://your-metadata-scraper.com/fetch",
  metadataApiKey: "your_metadata_api_key_here",
  
  // OpenAI-like service config (replace with your actual values)
  openaiApiBaseUrl: "http://100.67.233.36:8981/v1",
  openaiApiKey: "your_openai_compatible_api_key",
  chatModelName: "rstar-coder-qwen3-0.6b@bf16", // Renamed from visionModelName
  embeddingModelName: "fatboy-embeddings-v4-text-retrieval",

  // New Barcode Lookup API Key
  barcodeLookupApiKey: "nkg2i7b01p0xnu16igpuvq3rjy2mik"
};