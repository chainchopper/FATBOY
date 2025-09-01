export const environment = {
  production: true,
  ttsApiEndpoint: process.env['TTS_API_ENDPOINT'],
  ttsApiKey: process.env['TTS_API_KEY'],
  suggestionsApiEndpoint: process.env['SUGGESTIONS_API_ENDPOINT'],
  suggestionsApiKey: process.env['SUGGESTIONS_API_KEY'],
  metadataApiEndpoint: process.env['METADATA_API_ENDPOINT'],
  metadataApiKey: process.env['METADATA_API_KEY']
};