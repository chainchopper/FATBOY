# Tech Stack

- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/app/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.

**Component Placement Guideline:**
- All new components MUST be placed directly under the `src/app/` directory, typically in their own feature-specific folder (e.g., `src/app/my-feature/my-feature.component.ts`). Do NOT use `src/app/components/` or any other subdirectory for new components.

---

## 🤖 AI Service Endpoints and Usage

The application interacts with OpenAI-like API endpoints for chat, embeddings, and vision models. These endpoints typically follow a `/v1/` prefix.

**Base URL:** `http://api.blacknation.io:8981` (as configured in `src/environments/environment.ts`)

### 1. List Models
- **Endpoint:** `/v1/models`
- **Method:** `GET`
- **Description:** Lists the available AI models. Used by the application to check agent status.

### 2. Chat Completions (LLM)
- **Endpoint:** `/v1/chat/completions`
- **Method:** `POST`
- **Description:** Used for conversational AI interactions, including tool calling.
- **Request Body Example (JSON):**
  ```json
  {
    "model": "rstar-coder-qwen3-0.6b@bf16",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "tools": [...],
    "tool_choice": "auto",
    "temperature": 0.7,
    "max_tokens": 1024
  }
  ```

### 3. Embeddings
- **Endpoint:** `/v1/embeddings`
- **Method:** `POST`
- **Description:** Generates vector embeddings for text input.
- **Request Body Example (JSON):**
  ```json
  {
    "model": "fatboy-embeddings-v4-text-retrieval",
    "input": "Your text string to embed"
  }
  ```

---

## 🗣️ Chatterbox TTS API Endpoints and Usage

The application uses the Chatterbox TTS API for text-to-speech functionality.

**Base URL:** `http://api.blacknation.io:4123` (as configured in `src/environments/environment.ts`)

### 1. Text-to-Speech Conversion
- **Endpoint:** `/v1/audio/speech`
- **Method:** `POST`
- **Description:** Converts text input into speech audio.
- **Request Body Parameters:**
    - `input`: Required, 1-3000 characters.
    - `voice`: Optional, OpenAI voice name (e.g., "alloy") or custom voice library name (e.g., "KEVIN").
    - `exaggeration`: Optional, 0.25-2.0.
    - `cfg_weight`: Optional, 0.0-1.0.
    - `temperature`: Optional, 0.05-5.0.
- **Response:** `Content-Type: audio/wav`, binary audio data.

**Curl Example:**
```bash
curl -X POST http://localhost:4123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello, this is a test of the text to speech system."}' \
  --output speech.wav
```

**With custom parameters:**
```bash
curl -X POST http://localhost:4123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Dramatic speech!", "exaggeration": 1.2, "cfg_weight": 0.3}' \
  --output dramatic.wav
```

**Using a voice from the voice library:**
```bash
curl -X POST http://localhost:4123/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello with custom voice!", "voice": "my-uploaded-voice"}' \
  --output custom_voice.wav
```

### 2. Health Check
- **Endpoint:** `/v1/health`
- **Method:** `GET`
- **Description:** Checks if the API is running and the model is loaded.

### 3. List Voices
- **Endpoint:** `/v1/audio/voices`
- **Method:** `GET`
- **Description:** Lists available voices for TTS.

---

## ⚠️ CORS Configuration

For the frontend application to successfully communicate with these backend services, **Cross-Origin Resource Sharing (CORS)** must be properly configured on the server-side. It is recommended to either:
-   Set `Access-Control-Allow-Origin: *` (for development/testing, less secure for production).
-   Explicitly whitelist your frontend's domain (e.g., `http://localhost:3000` or your deployed domain) in the `Access-Control-Allow-Origin` header on the backend services.

---