# Fat Boy 🥦 → ✅

**Scan. Know. Choose.** Stop reading labels. Start scanning them.

Fat Boy is an open-source, AI-powered mobile app that instantly tells you if a food product aligns with your health goals. Scan a barcode, and get a simple **Yes** or **No** verdict based on your personalized filters for natural ingredients, harmful chemicals, and calories.

[![React Native](https://img.shields.io/badge/React%20Native-0.72-blue?style=flat&logo=react)](https://reactnative.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](http://makeapullrequest.com)
[![Open Food Facts](https://img.shields.io/badge/Data-Open%20Food%20Facts-yellow)](https://world.openfoodfacts.org/)

<p align="center">
  <img src="https://via.placeholder.com/300x600/4CAF50/ffffff?text=Fat+Boy+App" alt="Fat Boy App Mockup" width="300"/>
</p>

## ✨ Features

*   **⚡ Instant Barcode Scans:** Get a clear, color-coded verdict (Green ✅ or Red ❌) in seconds.
*   **🧠 AI-Powered Analysis:** Our fine-tuned NLP model parses and understands complex ingredient lists against your personal rules.
*   **🔧 Personalized Filters:** Tailor your "avoid list" – no artificial sweeteners, no MSG, no specific chemicals, calorie limits, etc.
*   **💾 Save Favorites:** Build a personal catalog of "approved" products for quick shopping.
*   **🌐 Community Driven:** Contribute by submitting products missing from our database.
*   **📊 Detailed Breakdown:** Don't just get a verdict; see *why* an ingredient was flagged.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v16 or newer)
*   npm, yarn, or bun
*   iOS (Xcode) and/or Android (Android Studio) development environments setup for React Native.
*   A keen eye for healthy living! 🥗

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/fat-boy-app.git
    cd fat-boy-app
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Install pods (iOS only)**
    ```bash
    cd ios && pod install && cd ..
    ```

4.  **Run the application**
    *   For iOS:
        ```bash
        npx react-native run-ios
        ```
    *   For Android:
        ```bash
        npx react-native run-android
        ```

## 📁 Project Structure

fat-boy-app/
├── tests/ # Unit and integration tests
├── android/ # Android native code
├── ios/ # iOS native code
├── src/
│ ├── components/ # Reusable UI components (Button, ScannerView, ProductCard)
│ ├── constants/ # App colors, themes, and fixed data
│ ├── contexts/ # React Contexts for state management (e.g., UserPreferences)
│ ├── hooks/ # Custom React Hooks
│ ├── navigation/ # App navigation setup
│ ├── screens/ # Main app screens (Scanner, Results, Saved)
│ ├── services/ # API calls (Open Food Facts, our backend)
│ ├── utils/ # Helper functions (AI rule engine, data parsers)
│ └── assets/ # Images, fonts, and icons
├── App.js # Main application component
└── index.js # Entry point



