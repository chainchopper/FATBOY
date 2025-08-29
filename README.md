# 🔮 Fat Boy: Your Personal Food Matrix

**Scan. Know. Choose.** Instantly decipher food labels with your AI-powered nutritional co-pilot.

Fat Boy is a cutting-edge mobile app that uses your phone's camera to analyze food products in real-time. Get an immediate **Approve ✅** or **Deny ❌** verdict based on your personalized health goals, saving you from the cryptic maze of ingredient lists.

[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <pre>
  ███████╗ █████╗ ████████╗  ██████╗  ██████╗ ██╗   ██╗
  ██╔════╝██╔══██╗╚══██╔══╝ ██╔═══██╗██╔═══██╗╚██╗ ██╔╝
  █████╗  ███████║   ██║    ██║   ██║██║   ██║ ╚████╔╝ 
  ██╔══╝  ██╔══██║   ██║    ██║   ██║██║   ██║  ╚██╔╝  
  ██║     ██║  ██║   ██║    ╚██████╔╝╚██████╔╝   ██║   
  ╚═╝     ╚═╝  ╚═╝   ╚═╝     ╚═════╝  ╚═════╝    ╚═╝   
  </pre>
</p>

## ✨ Core Features

*   **⚡ Instant Analysis:** Use **Label Scan (OCR)** or **Barcode Scan** to get a clear, color-coded verdict in seconds.
*   **🧠 AI-Powered Rule Engine:** Our system evaluates complex ingredient lists against your personal rules.
*   **🔧 Personalized Filters:** Fine-tune your "avoid list" – no artificial sweeteners, no MSG, calorie limits, etc.
*   **💾 Save Your Arsenal:** Build a personal gallery of "approved" products for quick shopping.
*   **🏆 Gamified Progress:** Unlock achievements and badges for making healthy choices and helping the community.
*   **🛒 Smart Shopping List:** Create and manage a shopping list directly from approved products.
*   **🤝 Community Driven:** Contribute products not yet in our database to help everyone.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or newer)
*   Angular CLI (`npm install -g @angular/cli`)
*   A passion for deciphering the food matrix! 🥗

### Installation & Launch

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/fat-boy-app.git
    cd fat-boy-app
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Launch the development server**
    ```bash
    ng serve
    ```
    Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## 🤖 How It Works: The Fat Boy Protocol

1.  **SCAN:** The user points their device at a product label or barcode. The camera feed is live.
2.  **CAPTURE:** On user command, an image is captured. For barcodes, the code is decoded. For labels, our **Tesseract.js** integration performs Optical Character Recognition (OCR) to extract the text.
3.  **ANALYZE:** The extracted ingredients and nutritional data are processed through our custom **Rule Engine**, which compares them against the user's personalized preferences.
4.  **VERDICT:** A final verdict—**Approve** or **Deny**—is generated and displayed with a detailed breakdown and immersive audio-visual cues. All scans are automatically logged to the user's private history.

## 🛠️ Tech Stack

*   **Frontend:** Angular & TypeScript
*   **Styling:** Custom CSS with a Cyberpunk Aesthetic
*   **Authentication:** Supabase (OAuth for Google, Facebook, etc.)
*   **OCR:** Tesseract.js
*   **Notifications:** ngx-toastr
*   **Deployment:** Docker & Nginx

## 🤝 How to Contribute

We welcome all agents to contribute to the mission.

1.  Fork the Project.
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the Branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

<p align="center">
Made with ❤️ and a desire for cleaner eating.
</p>