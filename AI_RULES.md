# Tech Stack

- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.

# AI Rules for Fat Boy App

## Overview
This document outlines the rules and guidelines for AI agents working on the **Fat Boy** app, a React-based application designed to help users make healthier food choices by scanning barcodes and analyzing ingredients. The app uses TypeScript, React Router, shadcn/ui, Tailwind CSS, and modern animation libraries to deliver a polished user experience.

## Core Stack & Architecture
- **Framework**: React with TypeScript.
- **Routing**: React Router. All routes must be defined in `src/App.tsx`.
- **Styling**: Tailwind CSS is the primary styling tool. Use utility classes extensively for layout, spacing, colors, and other design aspects. Avoid custom CSS; if necessary, use `@apply` sparingly in `src/index.css`.
- **UI Library**: Use shadcn/ui components without modification. For customization, create new components in `src/components/ui/` that compose shadcn/ui components.
- **Icons**: Use `lucide-react` for all iconography.
- **State Management**: Use `useState` and `useReducer` for local state, React Context for global state (e.g., user preferences), and be prepared to integrate TanStack Query for server state.
- **Animation**: Use `framer-motion` for complex animations (e.g., page transitions, staggering elements). Prefer CSS-transform properties for performance.

## Project Structure
- **Source Code**: All code must reside in the `src/` directory.
- **Pages**: Place page components in `src/pages/`. The main page is `src/pages/Index.tsx`.
- **Components**: Reusable components go in `src/components/`.
  - `src/components/ui/`: For base UI components (including shadcn/ui).
  - `src/components/custom/`: For application-specific components (e.g., `ProductCard`, `ScannerView`).
- **Imports**: Use absolute paths (e.g., `@/components/...`) for clarity.

## Design & Aesthetics
- **Color Palette**:
  - Primary Green: `#4CAF50` (for success/approved items).
  - Primary Red: `#F44336` (for warnings/avoided items).
  - Primary Black: `#212121` (for text and headers).
  - Primary Gray: `#757575` (for secondary text).
  - Background: `#FFFFFF` (primary) and `#F5F5F5` (secondary).
- **Typography**:
  - Headers: `font-family: 'Inter', sans-serif; font-weight: 700;`.
  - Body: `font-family: 'Inter', sans-serif; font-weight: 400;`.
  - Monospace: `font-family: 'Roboto Mono', monospace;` (for ingredient lists).
- **Micro-Interactions**:
  - Apply smooth transitions for hover/focus states (e.g., `transition-colors duration-200`).
  - Use skeleton loaders (`animate-pulse`) for loading states.
  - Implement page/component transitions with `framer-motion`.
- **Accessibility**:
  - Use semantic HTML elements.
  - Ensure full keyboard navigation and proper focus management.
  - Add `aria-*` attributes where needed. shadcn/ui components are built with Radix UI, which provides good a11y out of the box.

## Key Screens & Components
1. **Onboarding & Filter Setup** (`src/pages/Onboarding.tsx`):
   - Include a progress bar, toggle switches, and sliders for user preferences (e.g., avoiding artificial sweeteners, setting calorie limits).
   - Use icons from `lucide-react` (e.g., `Leaf` for natural ingredients, `Beaker` for chemicals).

2. **Scanner Screen** (`src/pages/Scanner.tsx`):
   - Dominated by a camera preview with a dashed viewfinder.
   - Include a pulsating scan button and navigation bar.

3. **Results Screen** (`src/pages/Results.tsx`):
   - Display a verdict card (green for "approved", red for "avoid").
   - Show product details, ingredient breakdown, and action buttons ("Scan Again", "Save Product").
   - Animate the verdict appearance using `framer-motion`.

4. **Saved Products Screen** (`src/pages/Saved.tsx`):
   - Use a grid layout of cards with product images, names, and save dates.
   - Include a search bar and empty state illustration.

## AI Fine-Tuning & Data Processing
- **Data Sources**: Use the Open Food Facts API for product data :cite[8].
- **AI Model**: Fine-tune a NLP model (e.g., BERT) to classify ingredients into categories (e.g., `natural`, `artificial_sweetener`).
- **Rule Engine**: Implement a rules engine that compares classified ingredients against the user's "avoid list" to generate a verdict.
- **Error Handling**: Handle loading, empty, and error states gracefully in all components.

## Performance & Best Practices
- **Optimization**: Use `React.memo()`, `useMemo()`, and `useCallback()` to prevent unnecessary re-renders.
- **Code Splitting**: Implement `React.lazy()` and `Suspense` for lazy-loading pages.
- **Testing**: Write unit and integration tests using Jest and React Testing Library.
- **Backwards Compatibility**: Ensure all database changes (if any) are backwards compatible :cite[1].

## Additional Enhancements (Future Versions)
- **V2 Features**:
  - OCR integration for products without barcodes.
  - Pre-made dietary profiles (e.g., Keto, Vegan).
  - Shopping list integration.
- **V3 Features**:
  - Personalized insights (e.g., "You avoided Red #40 45 times this month!").
  - Social features and community contributions.

## References
- This project uses Dyad, a local, open-source AI app builder that supports multiple AI models and ensures code remains on your machine :cite[2]:cite[4]:cite[8].
- For database changes, follow backwards compatibility rules to avoid breaking existing systems :cite[1].

---

