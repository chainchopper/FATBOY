export const environment = {
  production: true,

  // Specialized services (replace with your actual values)
  ttsApiEndpoint: "http://api.blacknation.io:4123", // Reverted to HTTP
  ttsApiKey: "your_tts_api_key_here",
  suggestionsApiEndpoint: "https://your-suggestions-agent.com/generate",
  suggestionsApiKey: "your_suggestions_api_key_here",
  metadataApiEndpoint: "https://your-metadata-scraper.com/fetch",
  metadataApiKey: "your_metadata_api_key_here",
  
  // OpenAI-like service config (replace with your actual values)
  openaiApiBaseUrl: "http://api.blacknation.io:8981", // Reverted to HTTP
  openaiApiKey: "your_openai_compatible_api_key",
  chatModelName: "rstar-coder-qwen3-0.6b@bf16",
  embeddingModelName: "fatboy-embeddings-v4-text-retrieval",
  visionModelName: "Moonbeam2", // New: Vision model name

  // New Barcode Lookup API Key
  barcodeLookupApiKey: "nkg2i7b01p0xnu16igpuvq3rjy2mik"
};