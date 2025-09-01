<p align="center">
  <img src="https://raw.githubusercontent.com/user-attachments/assets/e0a3e2b1-22d1-4b9b-851c-08b021110e4e" alt="Fat Boy Logo" width="280">
</p>

<h1 align="center">🔮 Fat Boy: Your Personal Food Matrix</h1>

<p align="center">
  <strong>Scan. Know. Choose.</strong> Instantly decipher food labels with your AI-powered nutritional co-pilot.
</p>

<p align="center">
  <a href="https://angular.io/" target="_blank"><img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular"></a>
  <a href="https://www.typescriptlang.org/" target="_blank"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://supabase.io/" target="_blank"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"></a>
  <a href="https://www.docker.com/" target="_blank"><img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"></a>
</p>

---

## 🚀 Why Fat Boy?

In a world saturated with confusing food labels and hidden ingredients, Fat Boy is your personal agent in the grocery aisle. It's a cutting-edge mobile app that uses your phone's camera to analyze food products in real-time, giving you an immediate **Approve ✅** or **Deny ❌** verdict based on *your* personalized health goals. No more decision fatigue, just clear, confident choices.

---

## ✨ Features Deep Dive

### 🤖 The Command Center: Your AI Agent Console
Interact directly with the app's AI through a sleek, chat-like interface. Use intuitive **slash commands** or **voice commands** to get instant insights and perform powerful actions.
-   **Intelligent Conversational AI**: Powered by `rstar-coder-qwen3-0.6b@bf16` (LLM with tool/function calling) and `fatboy-embeddings-v4-text-retrieval` (multi-modal embedding model).
-   **Personalized Context**: The AI is fed comprehensive user data including your profile, health preferences, recent scan history, shopping list, food diary summary, and unlocked achievements for highly relevant responses.
-   **AI Tool Calling**: Directly command the AI to perform actions like "Add this to my shopping list" or "Put this in my dinner diary." The AI executes these commands within the app, providing instant audio/visual confirmation.
-   **Contextual Follow-up Questions**: After each AI response, receive 3 clickable follow-up questions to guide your conversation. The initial greeting also provides helpful starting questions.
-   **Voice Commands**: Seamlessly interact with the AI using your voice, with a toggle in preferences to enable/disable.
-   **Persistent Chat History**: Your conversations with Fat Boy are saved locally (user-specific) and can be cleared via a custom modal.

### 📱 The Core Loop: Unified Intelligent Scanner
The heart of Fat Boy is a powerful, full-screen scanning experience. The intelligent camera automatically detects what you're pointing at—be it a **barcode, an ingredient label, or a full receipt**—and analyzes it in real-time.
-   **Full-Screen Immersive UI:** The camera feed fills the entire screen, with a semi-transparent header and footer for an unobstructed, futuristic feel.
-   **Multi-Target Detection:** Seamlessly switch between scanning barcodes for instant database lookups and capturing labels or receipts for detailed OCR analysis.

### 🧠 The Brain: Your Personal AI Rule Engine
Fat Boy's verdict is not a generic "healthy" or "unhealthy" rating. It's a personalized judgment based on a sophisticated set of rules that you control.
-   **Granular Ingredient Control:** Fine-tune your "avoid list" by selecting from dozens of pre-defined ingredients across categories like Artificial Sweeteners, Preservatives, and more.
-   **Custom Avoid List:** Manually add any ingredient you want to avoid for truly personalized analysis.
-   **Set Your Limits:** Use sliders to define your maximum calories per serving and your overall daily calorie target.
-   **Centralized Preferences**: All your preferences are now securely stored in Supabase, ensuring consistency across devices.

### 🤝 The Alliance: Interactive Community Feed
Contribute to a global database of food products and see what others are discovering in a dynamic, social feed.
-   **Contribute from History:** Effortlessly share products from your scan history. The app pre-fills all the information for you.
-   **Social Engagement:** **Like** and **comment** on contributions from other users.
-   **Shareable Metadata:** When you contribute, you can choose to attach metadata like your username, health goal, and leaderboard rank, which are all configurable in your privacy settings.

### 🏆 The Challenge: Gamified Progress & Social Leaderboards
Making healthy choices should be rewarding. Fat Boy includes a full-fledged gamification system to keep you motivated.
-   **Earn Points & Achievements:** Gain points for scanning products, adding healthy items to your lists, and contributing to the community. Unlock badges for reaching key milestones.
-   **Compete on the Leaderboard:** See how you stack up against the global community and your friends.
-   **Friends System**: Add friends, see their activity, and engage in friendly competition.

---

## 🛠️ Tech Stack

-   **Frontend:** Angular & TypeScript
-   **Styling:** Custom CSS with a Cyberpunk Aesthetic
-   **Authentication & DB:** Supabase (now centralizing most user data)
-   **OCR:** Tesseract.js
-   **Notifications:** ngx-toastr
-   **On-Device AI:** ONNX Runtime Web (for future on-device inference)
-   **Cloud AI:** LM Studio (OpenAI-compatible API) for `rstar-coder-qwen3-0.6b@bf16` (LLM) and `fatboy-embeddings-v4-text-retrieval` (Multi-modal Embeddings)
-   **Deployment:** Docker & Nginx

## 🏁 Getting Started

You can run Fanalogy in two ways: locally for development or via Docker for a production-like environment.

### 🐳 Method 1: Running with Docker (Recommended)

This is the easiest way to get the app running in a consistent environment.

**Prerequisites:**
*   [Docker](https://www.docker.com/get-started)
*   [Docker Compose](https://docs.docker.com/compose/install/)

**Steps:**
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/fanalogy-app.git
    cd fanalogy-app
    ```
2.  **Build and run the container:**
    ```bash
    docker-compose up --build
    ```
3.  **Access the app:** Open your browser and navigate to `http://localhost:3000`.
    *   **Note:** If port `3000` is in use on your machine, `docker-compose` will fail. You can manually change the host port mapping in `docker-compose.yaml` (e.g., `ports: - "8080:80"`) and then access the app at `http://localhost:8080`.

### 💻 Method 2: Local Development

**Prerequisites:**
*   Node.js (v18 or newer)
*   Angular CLI (`npm install -g @angular/cli`)
*   **LM Studio**: For running the AI models locally. Ensure `rstar-coder-qwen3-0.6b@bf16` and `fatboy-embeddings-v4-text-retrieval` are loaded and served via the OpenAI-compatible API endpoint (default: `http://localhost:1234/v1`). Update `src/environments/environment.ts` if your endpoint differs.

**Steps:**
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/fanalogy-app.git
    cd fanalogy-app
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Launch the development server:**
    ```bash
    npm start
    ```
    This will automatically try to launch the app on ports `3000`, `8080`, `4200`, or `4300` until an available port is found. Open your browser to the port indicated in the console.

## 🗺️ Project Roadmap

Our journey has just begun! Here's a glimpse of what's next:

-   [ ] **Full RAG Pipeline Integration**: Implement semantic search over user data (preferences, history, etc.) using `fatboy-embeddings-v4-text-retrieval` to inject highly relevant context into AI prompts, further enhancing response quality and reducing verbosity.
-   [ ] **Supabase Data Migration**: Complete the migration of all remaining local storage data (scan history, shopping lists, food diary, badges) to their respective Supabase tables.
-   [ ] **Food Diary & Performance Tracking**: Log your meals and get AI-powered feedback on your goals, leveraging your personalized preferences and history.
-   [ ] **Advanced AI Capabilities**: Explore multi-modal inputs (e.g., direct image analysis by `fatboy-embeddings-v4-text-retrieval`) and more sophisticated RAG strategies.
-   [ ] **On-Device AI Inference**: Optimize models for efficient local execution, enhancing privacy and offline functionality.
-   [ ] **Delivery Integration**: Connect with services like DoorDash or Uber Eats to order approved items.
-   [ ] **Calendar Sync**: Schedule meal plans and get reminders via Google Calendar.
-   [ ] **Enhanced Gamification**: Introduce new badge types, challenges, and deeper leaderboard integrations.
-   [ ] **Community Moderation Tools**: Develop features for reviewing and approving community contributions.

---

<p align="center">
Made with ❤️ and a desire for cleaner eating.
</p>