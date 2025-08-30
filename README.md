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

### 📱 The Core Loop: Dual-Mode Scanning
At the heart of Fat Boy is a powerful, dual-mode scanning system designed for speed and versatility.
-   **📄 Label Scan (OCR):** The default and most powerful mode. Using **Tesseract.js**, the app performs live Optical Character Recognition on a product's ingredient list. It's perfect for items without barcodes, like fresh bakery goods or produce from a local market.
-   **barcode Barcode Scan:** For packaged goods, the barcode scanner offers a lightning-fast way to retrieve product information from our database, powered by the Open Food Facts API.

### 🧠 The Brain: Your Personal AI Rule Engine
Fanalogy isn't just a scanner; it's a decision engine. The verdict you receive is not a generic "healthy" or "unhealthy" rating. It's a personalized judgment based on a sophisticated set of rules that you control.
-   **Fully Customizable:** On the **Preferences** screen, you can fine-tune your "avoid list." Toggle switches for common offenders like Artificial Sweeteners, High-Fructose Corn Syrup, MSG, and more.
-   **Set Your Limits:** Use a slider to define your maximum calories per serving.
-   **Goal-Oriented:** Choose a primary goal—like "Strictly Natural" or "Calorie Count"—to help the engine prioritize its analysis.

### 💾 The Arsenal: Your Personal Food Archive
Approved products aren't just a memory; they're an asset. The **Saved Products** page is a beautiful, interactive gallery of every item that has met your standards.
-   **Visual Gallery:** Each saved product is displayed as a card with its image, name, and brand.
-   **Interactive Actions:** Each card features an action bar with icons to **Star** (favorite), **Share**, or **Remove** the item. This is the foundation for future AI-powered nutritional analysis and sharing features.

### 🏆 The Challenge: Gamified Progress & Achievements
Making healthy choices should be rewarding. Fanalogy includes a full-fledged gamification system to keep you motivated.
-   **Unlock Badges:** Earn achievements for milestones like your first scan, saving an approved product, or contributing to the community.
-   **Achievements Page:** A dedicated screen displays all possible badges. Unlocked achievements are vibrant and glowing, while locked ones are grayed out, showing you what to aim for next.

### 🛒 The Strategy: Smart Shopping & Scan History
Fanalogy helps you plan your next grocery run and learn from your past choices.
-   **Shopping List:** Add any approved product to your shopping list directly from the results or saved products pages. On the **Shopping List** page, you can check off items as you shop or clear the list.
-   **Comprehensive History:** Every scan, good or bad, is automatically logged to your **History** page. You can review past verdicts, see which ingredients are most frequently flagged, and filter your history by category.

### 🤝 The Alliance: Community-Powered Database
A single agent is strong, but a network is unstoppable. The **Community** page allows you to contribute to the Fanalogy database.
-   **Submit New Products:** If you scan a product that isn't in our database, you can easily submit its name, brand, and ingredients.
-   **Earn Rewards:** Contributing to the community is a key way to unlock exclusive achievements.

---

## 🛠️ Tech Stack

-   **Frontend:** Angular & TypeScript
-   **Styling:** Custom CSS with a Cyberpunk Aesthetic
-   **Authentication:** Supabase (OAuth for Google, Facebook, etc.)
-   **OCR:** Tesseract.js
-   **Notifications:** ngx-toastr
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

-   [ ] **Food Diary & Performance Tracking:** Log your meals and get AI-powered feedback on your goals.
-   [ ] **Delivery Integration:** Connect with services like DoorDash or Uber Eats to order approved items.
-   [ ] **Calendar Sync:** Schedule meal plans and get reminders via Google Calendar.
-   [ ] **Advanced AI:** Integrate more powerful vision, TTS, and RAG models for an even smarter experience.

---

<p align="center">
Made with ❤️ and a desire for cleaner eating.
</p>