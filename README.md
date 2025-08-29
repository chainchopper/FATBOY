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

## ✨ Core Features

-   **⚡ Instant Analysis:** Use **Label Scan (OCR)** or **Barcode Scan** to get a verdict in seconds.
-   **🧠 AI-Powered Rule Engine:** Our system evaluates complex ingredient lists against your personal rules.
-   **🔧 Personalized Filters:** Fine-tune your "avoid list" – no artificial sweeteners, no MSG, calorie limits, etc.
-   **💾 Personal Food Archive:** Build a beautiful gallery of "approved" products for quick reference.
-   **🏆 Gamified Progress:** Unlock achievements and badges for making healthy choices.
-   **🛒 Smart Shopping List:** Create and manage a shopping list directly from approved products.
-   **🤝 Community Driven:** Contribute new products to our growing database.

## 🛠️ Tech Stack

-   **Frontend:** Angular & TypeScript
-   **Styling:** Custom CSS with a Cyberpunk Aesthetic
-   **Authentication:** Supabase (OAuth for Google, Facebook, etc.)
-   **OCR:** Tesseract.js
-   **Notifications:** ngx-toastr
-   **Deployment:** Docker & Nginx

## 🏁 Getting Started

You can run Fat Boy in two ways: locally for development or via Docker for a production-like environment.

### 🐳 Method 1: Running with Docker (Recommended)

This is the easiest way to get the app running in a consistent environment.

**Prerequisites:**
*   [Docker](https://www.docker.com/get-started)
*   [Docker Compose](https://docs.docker.com/compose/install/)

**Steps:**
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/fat-boy-app.git
    cd fat-boy-app
    ```
2.  **Build and run the container:**
    ```bash
    docker-compose up --build
    ```
3.  **Access the app:** Open your browser and navigate to `http://localhost:4200`.

### 💻 Method 2: Local Development

**Prerequisites:**
*   Node.js (v18 or newer)
*   Angular CLI (`npm install -g @angular/cli`)

**Steps:**
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/fat-boy-app.git
    cd fat-boy-app
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Launch the development server:**
    ```bash
    ng serve
    ```
4.  **Access the app:** Open your browser and navigate to `http://localhost:4200`.

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