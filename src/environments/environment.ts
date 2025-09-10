export const environment = {
  production: false,
  
  // Specialized services (replace with your actual values)
  ttsApiEndpoint: "http://api.blacknation.io:4123",
  ttsApiKey: "111111", // Set to 111111 as requested
  suggestionsApiEndpoint: "https://your-suggestions-agent.com/generate",
  suggestionsApiKey: "your_suggestions_api_key_here",
  metadataApiEndpoint: "https://your-metadata-scraper.com/fetch",
  metadataApiKey: "your_metadata_api_key_here",
  
  // OpenAI-like service config (replace with your actual values)
  openaiApiBaseUrl: "http://api.blacknation.io:8981",
  openaiApiKey: "111111", // Set to 111111 as requested
  chatModelName: "rstar-coder-qwen3-0.6b@bf16",
  embeddingModelName: "fatboy-embeddings-v4-text-retrieval",
  visionModelName: "Moonbeam2", // New: Vision model name

  // New Barcode Lookup API Key
  barcodeLookupApiKey: "nkg2i7b01p0xnu16igpuvq3rjy2mik"
};