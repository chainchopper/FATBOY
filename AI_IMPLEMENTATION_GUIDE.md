# AI & Intelligence Implementation Guide

This document provides a comprehensive overview of the **Nirvana Intelligence System** powered by Google's Gemini Live API, as well as the legacy AI and TTS services. This is intended for developers who need to understand, replicate, or extend the AI functionalities.

---

## 🌟 Nirvana: The Primary Intelligence System

**Nirvana** is the app's codename for the Gemini Live API integration. It provides real-time, multimodal AI capabilities with seamless voice and text interactions.

### Key Features

- **Real-time Bidirectional Streaming**: Low-latency audio and text communication
- **Function Calling**: AI can execute app functions (add to shopping list, search products, etc.)
- **Voice Synthesis**: Natural, affective voice responses in 30+ languages
- **Thinking Mode**: Optional visible reasoning process
- **Google Search Grounding**: Enhanced responses with real-time web data
- **Audio Export**: Conversation history with audio files for RAG pipelines

### Architecture

```
User Input (Text/Audio)
    ↓
NirvanaAdapterService (Adapter Layer)
    ↓
NirvanaService (WebSocket Connection)
    ↓
Gemini Live API (wss://generativelanguage.googleapis.com)
    ↓
Streaming Response (Text/Audio/Tool Calls)
    ↓
UI Components + Audio Playback
```

### Configuration

All Nirvana settings are configured in `environment.ts` and stored in user preferences:

```typescript
// Environment configuration
geminiApiKey: "your_gemini_api_key_here"
geminiLiveApiEndpoint: "wss://generativelanguage.googleapis.com/ws/..."

// User preferences (stored in Supabase)
nirvanaVoice: "Puck"  // Voice options: Puck, Charon, Kore, Fenrir, Aoede
nirvanaLanguage: "en-US"
nirvanaEnableAudio: true
nirvanaEnableThinking: false
nirvanaEnableGrounding: false
```

### Available Voices

Gemini Live API supports multiple expressive voices:
- **Puck**: Friendly and energetic
- **Charon**: Deep and authoritative  
- **Kore**: Warm and empathetic
- **Fenrir**: Bold and confident
- **Aoede**: Melodic and soothing

### Setup Instructions

1. **Get API Key**: Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com)

2. **Configure Environment**: Add the key to your `.env` file:
   ```
   GEMINI_API_KEY="your_actual_api_key_here"
   ```

3. **Auto-Initialization**: Nirvana automatically initializes when the app starts if the API key is configured. No additional setup required!

4. **Verify Connection**: The system automatically checks connectivity and falls back to legacy APIs if needed.

### Usage in Code

The `NirvanaAdapterService` provides a compatible interface with the existing `AiIntegrationService`:

```typescript
// Check if Nirvana is ready
const isReady = await nirvanaAdapter.checkAgentStatus();

// Send a message (text or audio)
const response = await nirvanaAdapter.getChatCompletion(
  userInput, 
  conversationHistory,
  lastProduct
);

// Update voice settings
nirvanaAdapter.updateVoice('Charon');

// Enable/disable features
nirvanaAdapter.setAudioEnabled(true);
nirvanaAdapter.setThinkingMode(false);
nirvanaAdapter.setGroundingEnabled(false);
```

### Function Calling

Nirvana supports all existing app functions through automatic tool registration:

- `add_to_food_diary` - Add items to food diary
- `add_to_shopping_list` - Add items to shopping list
- `remove_from_shopping_list` - Remove items from list
- `update_avoided_ingredients` - Update avoid lists
- `summarize_food_diary` - Get diary summaries
- `open_scanner` - Launch the barcode scanner
- `search_products` - Search local database
- `search_external_database` - Search Open Food Facts

Tools are automatically converted from OpenAI format to Gemini format by the adapter.

### Audio Handling

**Input Audio**: 16-bit PCM, 16kHz (automatically captured from microphone)

**Output Audio**: 24kHz PCM (played through Web Audio API)

The service includes:
- Audio queue management for smooth playback
- Automatic resampling if needed
- Voice Activity Detection (VAD)
- Conversation audio export for history

### Error Handling

Nirvana includes robust error handling:
- Automatic reconnection on connection loss (up to 5 attempts)
- Graceful fallback to legacy API if Nirvana unavailable
- Silent error handling (no debug info shown to users)
- User-friendly error messages

### Privacy & Security

- API key stored securely in environment variables
- No "Gemini" or "Google" branding visible to users
- All references use "Nirvana" or "Fat Boy" in UI
- No technical debugging information exposed in frontend

---

## 🔧 Legacy AI Services (Deprecated)

The following services are maintained for backward compatibility but will be phased out:

### OpenAI-Compatible Chat API

**Base URL:** `http://api.blacknation.io:8189` (as configured in `src/environments/environment.ts`)

#### Chat Completions Endpoint

```bash
POST http://api.blacknation.io:8189/v1/chat/completions
{
  "model": "rstar-coder-qwen3-0.6b@bf16",
  "messages": [...],
  "tools": [...],
  "temperature": 0.7
}
```

### Chatterbox TTS API (Legacy)

**Base URL:** `http://api.blacknation.io:4123`

#### Text-to-Speech Endpoint

```bash
POST http://api.blacknation.io:4123/v1/audio/speech
{
  "input": "Text to speak",
  "voice": "KEVIN"
}
```

**Note**: When Nirvana is active, Chatterbox TTS is bypassed in favor of Gemini's native voice synthesis.

---

## 🎯 Migration Guide

### For Developers

If you're updating code that uses the old `AiIntegrationService`:

1. **No Code Changes Required**: The service automatically uses Nirvana when configured
2. **Optional**: Use `NirvanaAdapterService` directly for advanced features
3. **Testing**: Ensure `GEMINI_API_KEY` is set in your `.env` for testing

### For Users

1. **Seamless Transition**: Users experience better AI with zero configuration
2. **Settings Available**: Voice preferences accessible in Settings → Preferences
3. **Privacy Maintained**: All AI features work exactly as before, just better

---

## 📊 Performance Considerations

### Latency
- **Nirvana**: ~200-500ms first token latency
- **Legacy API**: ~1-2s first token latency
- **Audio Streaming**: Real-time with <100ms buffering

### Bandwidth
- Text messages: <1KB per request
- Audio streaming: ~16KB/s (16kHz PCM)
- Recommended: 1Mbps+ connection for smooth audio

### Rate Limits
- Gemini API: Varies by tier (check Google AI Studio)
- Automatic backoff on rate limit errors
- Fallback to legacy API if quota exceeded

---

## 🐛 Troubleshooting

### "Intelligence System Unavailable"
- **Cause**: API key not configured or invalid
- **Solution**: Check `GEMINI_API_KEY` in `.env` file
- **Fallback**: System will use legacy API automatically

### Audio Not Playing
- **Cause**: Browser doesn't support Web Audio API
- **Solution**: Use a modern browser (Chrome, Firefox, Safari)
- **Fallback**: Text responses still work

### Connection Keeps Dropping
- **Cause**: Network instability or firewall blocking WebSocket
- **Solution**: Check firewall settings, ensure stable connection
- **Note**: Service auto-reconnects up to 5 times

### Voice Not Changing
- **Cause**: Settings not saved or API doesn't support selected voice
- **Solution**: Save preferences, try a different voice
- **Available**: Puck, Charon, Kore, Fenrir, Aoede

---

## 🔗 Additional Resources

- [Gemini Live API Documentation](https://ai.google.dev/gemini-api/docs/live)
- [Google AI Studio](https://aistudio.google.com/live)
- [Function Calling Guide](https://ai.google.dev/gemini-api/docs/function-calling)
- [Audio Capabilities](https://ai.google.dev/gemini-api/docs/audio)

---

## 💻 Frontend Integration Overview

The AI and TTS features are integrated into the Angular application via specialized services:

-   **`NirvanaService`**: Core WebSocket connection to Gemini Live API. Handles all low-level communication.
-   **`NirvanaAdapterService`**: Adapter layer that maintains compatibility with existing app interfaces while providing Nirvana capabilities.
-   **`AiIntegrationService`**: Main AI service that automatically uses Nirvana when available, falls back to legacy API otherwise.
-   **`AiContextService`**: Compiles user context for AI prompts (profile, preferences, history, etc.)
-   **`ToolExecutorService`**: Executes function calls within the app (add to lists, search, etc.)
-   **`ChatterboxTtsService`**: Legacy TTS service (bypassed when Nirvana is active)

### Service Hierarchy

```
AgentConsoleComponent
    ↓
AiIntegrationService (Auto-routing)
    ├→ NirvanaAdapterService (Primary)
    │     ↓
    │  NirvanaService (WebSocket)
    │     ↓
    │  Gemini Live API
    └→ Legacy OpenAI API (Fallback)
```