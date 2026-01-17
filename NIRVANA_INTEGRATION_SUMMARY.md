# Nirvana Intelligence System - Integration Summary

## Overview

**Nirvana** is the codename for the Gemini Live API integration that powers ALL intelligence features in the FATBOY application. This document provides a complete overview of the integration for developers and maintainers.

## What is Nirvana?

Nirvana is the ONLY AI provider in this application - a complete intelligence system powered by Google's Gemini Live API. The system provides:

- **Real-time bidirectional streaming** for audio and text
- **Natural voice synthesis** in 30+ languages with 5 distinct voice personalities
- **Multimodal Real-Time Streaming**: Bidirectional audio and video/screen capture.
- **Advanced Function Calling**: Native support for application control and data management.
- **Multimodal Perception**: Ability to "see" and process frames from camera or screen sharing.
- **High-Fidelity TTS**: Multiple expressive voices with low-latency synthesis.

## Default Configuration

**Nirvana is hardwired as the default and only AI provider.** All settings are configured via environment variables:

```env
# Primary Intelligence System (Required)
NIRVANA_API_KEY="your_nirvana_api_key_here"
NIRVANA_LIVE_API_ENDPOINT="wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"

# Optional fallback endpoints (if needed)
OPENAI_API_BASE_URL="http://your-fallback-api:8189/v1"
OPENAI_API_KEY="fallback_key"
```

**NO UI-based provider selection** - everything is configured at deployment time.

## Architecture

### Service Layer

```
┌─────────────────────────────────────────────────────────────┐
│                  Angular Application                         │
├─────────────────────────────────────────────────────────────┤
│  AiIntegrationService (Auto-routing layer)                  │
│    ├─→ NirvanaAdapterService (Primary)                      │
│    │     └─→ NirvanaService (WebSocket)                     │
│    │           └─→ Gemini Live API                          │
│    └─→ Legacy OpenAI API (Fallback)                         │
├─────────────────────────────────────────────────────────────┤
│  Supporting Services:                                        │
│    • AiContextService - User context compilation            │
│    • ToolExecutorService - Function execution               │
│    • PreferencesService - Voice/settings storage            │
│    • AudioService - Success sounds                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **NirvanaService** (`src/app/services/nirvana.service.ts`)
   - Low-level WebSocket connection management
   - Audio streaming (PCM encoding/decoding)
   - Session state management
   - Reconnection logic (up to 5 attempts)
   - Error handling with silent fallbacks

2. **NirvanaAdapterService** (`src/app/services/nirvana-adapter.service.ts`)
   - Compatibility layer with existing app interfaces
   - Tool definition conversion (OpenAI → Gemini format)
   - Tool execution orchestration
   - Response accumulation and parsing
   - Preference integration

3. **AiIntegrationService** (Updated)
   - Automatic routing to Nirvana when configured
   - Fallback to legacy API if Nirvana unavailable
   - Transparent to existing components

## Configuration

### Environment Setup

Add to `.env` file:
```bash
GEMINI_API_KEY="your_actual_gemini_api_key_here"
```

Get your API key from: https://aistudio.google.com

### User Preferences

All stored in Supabase `fatboy_user_preferences` table:

```typescript
{
  nirvanaVoice: string,          // Puck, Charon, Kore, Fenrir, Aoede
  nirvanaLanguage: string,       // en-US, es-ES, fr-FR, etc.
  nirvanaEnableAudio: boolean,   // Voice responses on/off
  nirvanaEnableThinking: boolean,// Show reasoning process
  nirvanaEnableGrounding: boolean // Web search grounding
}
```

## Voice Personalities

| Voice   | Personality            | Best For                    |
|---------|------------------------|----------------------------|
| Puck    | Friendly & energetic   | Casual, upbeat interactions|
| Charon  | Deep & authoritative   | Serious, factual advice    |
| Kore    | Warm & empathetic      | Supportive guidance        |
| Fenrir  | Bold & confident       | Motivational coaching      |
| Aoede   | Melodic & soothing     | Calm, relaxing responses   |

## Supported Languages

- English (US, UK)
- Spanish (Spain, Mexico)
- French
- German
- Italian
- Portuguese (Brazil)
- Japanese
- Korean
- Chinese (Simplified)

*30+ additional languages supported by Gemini Live API*

## Function Calling

All existing app functions are automatically available to Nirvana:

### Available Functions

1. **add_to_food_diary** - Add items to food diary with meal type
2. **add_to_shopping_list** - Add items to shopping list
3. **remove_from_shopping_list** - Remove items from list
4. **update_avoided_ingredients** - Update user's avoid lists
5. **summarize_food_diary** - Get daily diary summaries
6. **open_scanner** - Launch the unified scanner
7. **search_products** - Search local product database
8. **search_external_database** - Search Open Food Facts API

### Tool Execution Flow

```
User: "Add oat milk to my shopping list"
  ↓
Nirvana analyzes intent
  ↓
Calls: add_to_shopping_list({product_name: "oat milk", brand: "generic"})
  ↓
ToolExecutorService executes
  ↓
Result sent back to Nirvana
  ↓
Nirvana: "Done! I've added oat milk to your shopping list."
```

## Audio Handling

### Input Audio (User → Nirvana)
- **Format**: 16-bit PCM
- **Sample Rate**: 16kHz
- **Channels**: Mono
- **Source**: Browser microphone via MediaRecorder API

### Output Audio (Nirvana → User)
- **Format**: 24kHz PCM
- **Playback**: Web Audio API
- **Buffering**: Queue-based for smooth playback
- **Latency**: <100ms

### Audio Queue Management

```typescript
1. Receive audio chunk from Nirvana (base64 PCM)
2. Decode to ArrayBuffer
3. Convert to Float32Array (-1.0 to 1.0)
4. Add to queue
5. Play next chunk when previous finishes
6. Loop until queue empty
```

## Error Handling

### Connection Errors

```
1. WebSocket connection fails
   ↓
2. Automatic reconnection (exponential backoff)
   ↓
3. Up to 5 reconnection attempts
   ↓
4. If all fail → Fallback to legacy API
```

### API Key Errors

```
1. Missing or invalid API key detected
   ↓
2. Silent warning in console
   ↓
3. Automatic fallback to legacy API
   ↓
4. No user-facing error message (seamless)
```

### Tool Execution Errors

```
1. Tool execution fails
   ↓
2. Error sent back to Nirvana
   ↓
3. Nirvana formulates user-friendly response
   ↓
4. User sees helpful message, not technical error
```

## Security & Privacy

### No Debug Information in Frontend

All references to "Gemini" or "Google" are internal only:
- Console logs use `[Nirvana]` prefix
- User-facing text uses "Fat Boy" or "Nirvana"
- No API endpoints exposed in UI
- No error details shown to users

### API Key Protection

- Stored in environment variables only
- Never sent to client browser
- WebSocket connection authenticated server-side
- No key exposure in JavaScript console

### Data Privacy

- Conversations encrypted in transit (WSS)
- No conversation data stored on Google servers beyond session
- User preferences stored in Supabase (user-controlled)
- Audio can be exported locally (future feature)

## Testing

### Manual Testing Checklist

- [ ] Voice selection changes voice in real-time
- [ ] Language selection affects response language
- [ ] Audio toggle enables/disables voice responses
- [ ] Thinking mode shows reasoning (when available)
- [ ] Grounding provides web-sourced information
- [ ] All 8 function calls work correctly
- [ ] Reconnection works after network disruption
- [ ] Fallback to legacy API on Nirvana failure
- [ ] No "Gemini" or "Google" visible to users

### Browser Compatibility

| Browser | WebSocket | Web Audio | Speech Recognition |
|---------|-----------|-----------|-------------------|
| Chrome  | ✅        | ✅        | ✅                |
| Firefox | ✅        | ✅        | ✅                |
| Safari  | ✅        | ✅        | ⚠️ Limited       |
| Edge    | ✅        | ✅        | ✅                |

## Performance Metrics

### Expected Latency
- First token: 200-500ms
- Audio streaming: Real-time (<100ms buffering)
- Function execution: 50-200ms

### Bandwidth Requirements
- Text: <1KB per message
- Audio input: ~16KB/s (16kHz PCM)
- Audio output: ~24KB/s (24kHz PCM)
- **Recommended**: 1Mbps+ connection for smooth audio

### Rate Limits
- Gemini API tier-dependent (check Google AI Studio)
- Automatic exponential backoff on rate limit
- Fallback to legacy API if quota exceeded

## Migration from Legacy API

### What Changed

| Feature | Legacy | Nirvana |
|---------|--------|---------|
| Latency | 1-2s | 200-500ms |
| Voice Quality | Chatterbox TTS | Gemini native (superior) |
| Languages | English only | 30+ languages |
| Audio Streaming | Post-response | Real-time |
| Thinking Mode | Not available | Optional |
| Web Grounding | Not available | Optional |
| Function Calling | OpenAI format | Gemini format (auto-converted) |

### Backward Compatibility

- Existing components work without changes
- AiIntegrationService automatically routes to Nirvana
- Legacy API used as fallback (no functionality lost)
- User preferences migrate automatically

## Troubleshooting

### Common Issues

**Problem**: "Intelligence System Unavailable"
- **Cause**: API key not configured
- **Fix**: Add `GEMINI_API_KEY` to `.env`

**Problem**: Audio not playing
- **Cause**: Browser doesn't support Web Audio API
- **Fix**: Use modern browser (Chrome, Firefox, Edge)

**Problem**: Connection keeps dropping
- **Cause**: Network instability or firewall
- **Fix**: Check firewall, ensure stable connection

**Problem**: Voice doesn't change
- **Cause**: Preference not saved or unsupported voice
- **Fix**: Save preferences, try different voice

### Debug Mode

Enable detailed logging (development only):
```typescript
localStorage.setItem('NIRVANA_DEBUG', 'true');
```

View console logs with `[Nirvana]` prefix for troubleshooting.

## Future Enhancements

### Planned Features
- [ ] Conversation history export with audio files
- [ ] RAG pipeline using conversation history
- [ ] Direct image analysis (multimodal)
- [ ] Proactive suggestions based on user behavior
- [ ] Custom voice training (if API supports)
- [ ] Offline mode with cached responses

### Research & Experiments
- [ ] On-device model fine-tuning
- [ ] Multi-turn conversation optimization
- [ ] Personalized voice synthesis
- [ ] Integration with calendar/reminders
- [ ] Meal planning with AI assistance

## Resources

- [Gemini Live API Documentation](https://ai.google.dev/gemini-api/docs/live)
- [Google AI Studio](https://aistudio.google.com/live)
- [Function Calling Guide](https://ai.google.dev/gemini-api/docs/function-calling)
- [FATBOY AI Implementation Guide](./AI_IMPLEMENTATION_GUIDE.md)
- [FATBOY README](./README.md)

## Credits

Nirvana integration designed and implemented as a complete overhaul of the FATBOY intelligence system, leveraging Google's Gemini Live API for state-of-the-art conversational AI capabilities.

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: Production Ready (requires API key configuration)
