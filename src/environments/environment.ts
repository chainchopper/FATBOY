// NOTE: The build system has been reverted to the standard Angular builder to fix compilation errors.
// Environment variables from .env are no longer automatically injected.
// You will need to manage your keys and endpoints here manually for now.

export const environment = {
  production: false,
  
  // Specialized services (replace with your actual values)
  ttsApiEndpoint: "https://your-tts-api.com/synthesize",
  ttsApiKey: "your_tts_api_key_here",
  suggestionsApiEndpoint: "https://your-suggestions-agent.com/generate",
  suggestionsApiKey: "your_suggestions_api_key_here",
  metadataApiEndpoint: "https://your-metadata-scraper.com/fetch",
  metadataApiKey: "your_metadata_api_key_here",
  
  // OpenAI-like service config (replace with your actual values)
  openaiApiBaseUrl: "http://api.blacknation.io:8981/v1",
  openaiApiKey: "your_openai_compatible_api_key",
  visionModelName: "moondream2"
};