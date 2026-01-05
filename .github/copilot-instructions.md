# FATBOY - GitHub Copilot Instructions

## Project Overview

FATBOY is an AI-powered nutritional analysis mobile application that helps users make informed food choices by scanning barcodes, labels, and receipts. The app provides personalized verdicts based on user preferences and AI-powered insights.

## Tech Stack

### Frontend
- **Framework**: Angular 17 with TypeScript
- **Styling**: Tailwind CSS with Cyberpunk aesthetic
- **UI Libraries**: 
  - lucide-angular for icons
  - ngx-toastr for notifications
  - ng2-charts for data visualization
  - html5-qrcode for barcode scanning
- **State Management**: Angular services with RxJS
- **Router**: Angular Router

### Backend & Services
- **Database & Auth**: Supabase (PostgreSQL, Edge Functions, Authentication)
- **AI Services**: OpenAI-compatible API endpoints
  - LLM Model: `rstar-coder-qwen3-0.6b@bf16`
  - Embeddings: `fatboy-embeddings-v4-text-retrieval`
  - Base URL: `http://api.blacknation.io:8981`
- **TTS**: Chatterbox TTS API (`http://api.blacknation.io:4123`)
- **OCR**: Tesseract.js
- **External APIs**: Open Food Facts API for barcode lookups
- **AI Runtime**: ONNX Runtime Web (for future on-device inference)

### Deployment
- **Containerization**: Docker with docker-compose
- **Web Server**: Nginx
- **Mobile**: Capacitor for iOS and Android

## Project Structure

```
src/
├── app/                    # Core application components and services
│   ├── components/        # Reusable UI components
│   ├── services/          # Angular services (AI, Auth, Data)
│   ├── guards/            # Route guards
│   └── models/            # TypeScript interfaces and types
├── environments/          # Environment configurations
├── assets/               # Static assets (images, fonts, etc.)
└── styles/               # Global styles and Tailwind config
```

## Coding Guidelines

### Angular Best Practices
1. **Components**: All new components MUST be created in `src/app/` with their own feature-specific folder
   - Example: `src/app/my-feature/my-feature.component.ts`
   - Do NOT use nested `components/` folders like `src/app/components/my-feature/`
   
2. **Services**: Create services in `src/app/services/`
   - Use dependency injection
   - Implement proper RxJS patterns (Observable, Subject, BehaviorSubject)
   - Handle subscriptions properly (unsubscribe in ngOnDestroy)

3. **Routing**: Keep routes in `src/app/app-routing.module.ts` or `src/app/app.routes.ts`

4. **TypeScript**: 
   - Use strict typing (TypeScript 5.4+)
   - Define interfaces for all data models in `src/app/models/`
   - Avoid `any` types where possible

### Styling
- **Primary**: Use Tailwind CSS utility classes extensively
- **Theme**: Cyberpunk aesthetic with custom CSS where needed
- **Forms**: Use `@tailwindcss/forms` for form styling
- **Typography**: Use `@tailwindcss/typography` for rich text

### State Management
- Use Angular services with RxJS for state management
- Implement proper reactive patterns with Observables
- Store sensitive data in Supabase, not localStorage (migration in progress)

## AI Integration

### AI Service Architecture
The application uses multiple AI services coordinated through Angular services:

1. **AiIntegrationService** (`src/app/services/ai-integration.service.ts`)
   - Central hub for AI communication
   - Handles chat completions with tool calling
   - Manages agent status checks

2. **AiContextService** (`src/app/services/ai-context.service.ts`)
   - Compiles user context for AI prompts
   - Includes profile, preferences, scan history, shopping list, diary summary

3. **ToolExecutorService** (`src/app/services/tool-executor.service.ts`)
   - Executes AI tool calls within the app
   - Functions: add_to_shopping_list, add_to_food_diary, search_database, etc.

4. **ChatterboxTtsService** (`src/app/services/chatterbox-tts.service.ts`)
   - Manages text-to-speech functionality
   - Voice management and audio playback

### AI API Endpoints

#### Chat Completions
```typescript
POST http://api.blacknation.io:8981/v1/chat/completions
{
  "model": "rstar-coder-qwen3-0.6b@bf16",
  "messages": [
    {"role": "system", "content": "You are Fat Boy, an AI nutritional co-pilot..."},
    {"role": "user", "content": "User message"}
  ],
  "tools": [...],  // Function definitions for tool calling
  "tool_choice": "auto",
  "temperature": 0.7,
  "max_tokens": 1024
}
```

#### Embeddings (for future RAG pipeline)
```typescript
POST http://api.blacknation.io:8981/v1/embeddings
{
  "model": "fatboy-embeddings-v4-text-retrieval",
  "input": "Text to embed"
}
```

#### TTS
```typescript
POST http://api.blacknation.io:4123/v1/audio/speech
{
  "input": "Text to speak",
  "voice": "KEVIN",
  "exaggeration": 1.0,
  "cfg_weight": 0.5,
  "temperature": 1.0
}
```

## Supabase Integration

### Current Tables
- User profiles and preferences
- Shopping lists
- Food diary entries
- Achievements and badges
- Community contributions (likes, comments)
- Leaderboard data

### Data Migration Status
⚠️ **In Progress**: Migrating from localStorage to Supabase for:
- Scan history
- Complete shopping list data
- Full food diary
- Badge unlocks

### Edge Functions
- Server-side logic for complex operations
- Can call external APIs (e.g., Open Food Facts)

## Development Workflow

### Running Locally
```bash
npm install           # Install dependencies
npm start            # Starts dev server (auto-finds available port: 3000, 8080, 4200, 4300)
npm run build        # Production build
npm run lint         # ESLint
```

### Docker Development
```bash
docker-compose up --build   # Build and run in container
# Access at http://localhost:3000
```

### Environment Variables
Required in `.env` file:
- Supabase credentials (URL, anon key)
- AI service endpoints
- TTS service endpoints
- Open Food Facts API config

## Key Features to Understand

### 1. Unified Scanner
- Full-screen camera with multi-target detection
- Barcode scanning → Open Food Facts API lookup
- OCR for ingredient labels and receipts → Tesseract.js

### 2. AI Agent Console
- Chat interface with tool calling capability
- Voice commands (optional)
- Slash commands for quick actions
- Contextual follow-up questions

### 3. Personal Rule Engine
- User-defined avoid lists (ingredients, additives)
- Calorie limits and targets
- Personalized verdicts (not generic "healthy/unhealthy")

### 4. Gamification
- Points system for actions
- Badge unlocks for milestones
- Global and friend leaderboards

### 5. Community Feed
- Share products from scan history
- Like and comment on contributions
- Privacy-controlled metadata sharing

## Common Tasks

### Adding a New Component
```bash
ng generate component app/feature-name
```

### Adding a New Service
```bash
ng generate service app/services/service-name
```

### Adding Dependencies
```bash
npm install package-name
```

## Testing
- **Framework**: Jasmine + Karma
- **Command**: `npm test`
- Write unit tests for services
- Component testing for critical UI flows

## CORS Requirements
Both AI and TTS backend services must have CORS enabled:
- Development: `Access-Control-Allow-Origin: *`
- Production: Whitelist specific domains

## Roadmap Priorities
1. **RAG Pipeline**: Semantic search over user data with embeddings
2. **Data Migration**: Complete Supabase migration
3. **Food Diary**: Enhanced tracking with AI feedback
4. **Multi-modal AI**: Direct image analysis
5. **On-Device Inference**: Optimize for local execution
6. **Integrations**: DoorDash, Uber Eats, Google Calendar

## Code Review Checklist
- [ ] TypeScript types properly defined
- [ ] RxJS subscriptions properly managed
- [ ] Tailwind CSS used for styling
- [ ] Supabase queries use proper error handling
- [ ] AI service calls include fallback/error states
- [ ] Components follow Angular style guide
- [ ] Services use dependency injection
- [ ] No hardcoded credentials (use environment files)
- [ ] Mobile-responsive design
- [ ] Accessibility considerations (ARIA labels where needed)

## Important Notes
- This is an **Angular** project, not React
- User data is being migrated to Supabase (prefer Supabase over localStorage)
- AI services are external APIs (not embedded models)
- The app targets mobile platforms via Capacitor
- Cyberpunk aesthetic is a key design principle