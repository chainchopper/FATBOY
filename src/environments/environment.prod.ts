export const environment = {
  production: true,
  ttsApiEndpoint: process.env['TTS_API_ENDPOINT'],
  ttsApiKey: process.env['TTS_API_KEY'],
  suggestionsApiEndpoint: process.env['SUGGESTIONS_API_ENDPOINT'],
  suggestionsApiKey: process.env['SUGGESTIONS_API_KEY'],
  metadataApiEndpoint: process.env['METADATA_API_ENDPOINT'],
  metadataApiKey: process.env['METADATA_API_KEY'],

  // New OpenAI-like service config
  openaiApiBaseUrl: process.env['OPENAI_API_BASE_URL'],
  openaiApiKey: process.env['OPENAI_API_KEY'],
  visionModelName: process.env['VISION_MODEL_NAME']
};