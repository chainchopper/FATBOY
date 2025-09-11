# AI & TTS Implementation Guide

This document provides a comprehensive overview of the AI and Text-to-Speech (TTS) services used in this application. It is intended for developers who need to understand, replicate, or extend the AI functionalities.

---

## 🤖 AI Service Endpoints and Usage (OpenAI-like)

The application interacts with OpenAI-like API endpoints for chat, embeddings, and vision models. These endpoints typically follow a `/v1/` prefix.

**Base URL:** `http://api.blacknation.io:8981` (as configured in `src/environments/environment.ts`)

### 1. List Models

-   **Endpoint:** `/v1/models`
-   **Method:** `GET`
-   **Description:** Lists the available AI models. This is used by the application's `checkAgentStatus()` method to verify that the AI service is online and the required models are loaded.

**Curl Example:**

```bash
curl http://api.blacknation.io:8981/v1/models
```

### 2. Chat Completions (LLM)

-   **Endpoint:** `/v1/chat/completions`
-   **Method:** `POST`
-   **Description:** Used for all conversational AI interactions, including the powerful "tool calling" feature that allows the AI to command the application to perform actions.
-   **Model Used:** `rstar-coder-qwen3-0.6b@bf16`

**Request Body Example (JSON):**

```json
{
  "model": "rstar-coder-qwen3-0.6b@bf16",
  "messages": [
    {
      "role": "system",
      "content": "You are Fat Boy, an AI nutritional co-pilot..."
    },
    {
      "role": "user",
      "content": "Can you add milk to my shopping list?"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "add_to_shopping_list",
        "description": "Adds a food product to the user's shopping list.",
        "parameters": {
          "type": "object",
          "properties": {
            "product_name": { "type": "string" },
            "brand": { "type": "string" }
          },
          "required": ["product_name", "brand"]
        }
      }
    }
  ],
  "tool_choice": "auto",
  "temperature": 0.7,
  "max_tokens": 1024
}
```

### 3. Embeddings

-   **Endpoint:** `/v1/embeddings`
-   **Method:** `POST`
-   **Description:** Generates vector embeddings for text input. This is planned for use in a future Retrieval-Augmented Generation (RAG) pipeline to provide the AI with highly relevant context from the user's history and preferences.
-   **Model Used:** `fatboy-embeddings-v4-text-retrieval`

**Request Body Example (JSON):**

```json
{
  "model": "fatboy-embeddings-v4-text-retrieval",
  "input": "Your text string to embed"
}
```

---

## 🗣️ Chatterbox TTS API Endpoints and Usage

The application uses the Chatterbox TTS API for all text-to-speech functionality, giving the AI its voice.

**Base URL:** `http://api.blacknation.io:4123` (as configured in `src/environments/environment.ts`)

### 1. Text-to-Speech Conversion

-   **Endpoint:** `/v1/audio/speech`
-   **Method:** `POST`
-   **Description:** Converts a string of text into speech audio.
-   **Request Body Parameters:**
    -   `input` (string, required): The text to be converted to speech (1-3000 characters).
    -   `voice` (string, optional): The name of the voice to use (e.g., "KEVIN"). Defaults to the one set in user preferences.
    -   `exaggeration` (float, optional): 0.25 - 2.0.
    -   `cfg_weight` (float, optional): 0.0 - 1.0.
    -   `temperature` (float, optional): 0.05 - 5.0.
-   **Response:** The raw audio data with `Content-Type: audio/wav`.

**Curl Example (Basic):**

```bash
curl -X POST http://api.blacknation.io:4123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello, this is a test of the text to speech system."}' \
  --output speech.wav
```

**Curl Example (With Custom Parameters):**

```bash
curl -X POST http://api.blacknation.io:4123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "This is a very dramatic reading!", "exaggeration": 1.5, "voice": "KEVIN"}' \
  --output dramatic_speech.wav
```

### 2. Health Check

-   **Endpoint:** `/v1/health`
-   **Method:** `GET`
-   **Description:** Checks if the TTS API is running and if the underlying speech model is loaded correctly.

### 3. List Voices

-   **Endpoint:** `/v1/audio/voices`
-   **Method:** `GET`
-   **Description:** Returns a JSON array of available voices that can be used for TTS.

---

## ⚠️ CORS Configuration

For the frontend application to successfully communicate with these backend services, **Cross-Origin Resource Sharing (CORS)** must be properly configured on the servers hosting the AI and TTS APIs.

It is recommended to either:

-   Set `Access-Control-Allow-Origin: *` (less secure, suitable for development).
-   Explicitly whitelist your frontend's domain (e.g., `http://localhost:3000` or your deployed domain) in the `Access-Control-Allow-Origin` header on the backend services.

---

## 💻 Frontend Integration Overview

The AI and TTS features are integrated into the Angular application via a set of specialized services:

-   **`AiIntegrationService`**: The central hub for communicating with the AI. It handles checking the agent's status, constructing the final prompt with user context, sending requests to the `/v1/chat/completions` endpoint, and processing the AI's response.
-   **`ChatterboxTtsService`**: Manages all text-to-speech functionality. It checks the TTS API health, fetches available voices, and sends text to the `/v1/audio/speech` endpoint to be converted into audio, which is then played in the browser.
-   **`AiContextService`**: Responsible for gathering and compiling all relevant user data (profile, preferences, scan history, etc.) into a concise context string that is injected into the AI's system prompt.
-   **`ToolExecutorService`**: When the AI's response includes a "tool call," this service is responsible for executing the corresponding function within the Angular app (e.g., adding an item to the `ShoppingListService`).