# MasterGrowbot AI: Premium Cannabis Cultivation Assistant

MasterGrowbot AI is a sophisticated, high-fidelity mobile and web application designed to empower legal cannabis cultivators with expert-level biological insights, real-time coaching, and comprehensive garden management tools. This project bridges the gap between raw plant data and actionable cultivation intelligence using the Google Gemini ecosystem.

---

## 🚀 Section 1: Project Identity & Vision

**Core Mission:** To prevent crop loss and optimize harvest quality for legal growers through multi-modal AI intelligence.

**Key Value Propositions:**
- **Instant Diagnostics:** Computer vision trained to recognize nutrient deficiencies, pests, and environmental stress.
- **Hands-Free Mentorship:** A low-latency voice interface for interacting with the AI "Grow Coach" while working in the garden.
- **Genetic Context:** Deep integration with a verified strain database to provide genotype-specific advice.
- **Data-Driven Journaling:** Automated analysis of cultivation logs to predict yields and track plant health trends.

---

## 🛠 Section 2: Technical Architecture (The Stack)

### Frontend & Core Logic
- **Framework:** React 18 (Strict Mode) utilizing TypeScript for robust type safety.
- **State Management:** Contextual state lifting in `App.tsx` managing global `UserProfile`, `Plant` data, and `OnboardingStatus`.
- **Styling Engine:** Custom **Glassmorphism Design System** (defined in `index.html`) using raw CSS variables for maximum performance and native feel.
- **Icons:** Lucide-React for a crisp, high-contrast professional interface.

### Mobile & Native Bridge
- **Platform:** Capacitor 6.0
- **Permissions:** Native Camera and Microphone access configured in `metadata.json` and `capacitor.config.ts`.
- **UX Enhancements:** Native Splash Screen and In-App Review integration via `@capacitor-community/in-app-review`.

### Backend & Infrastructure
- **Identity & Storage:** Supabase (Auth, PostgreSQL, and Storage for user-uploaded plant photos).
- **Billing:** RevenueCat integration for seamless subscription management (Weekly, Monthly, Yearly tiers).

---

## 🧠 Section 3: AI Model Implementation (Gemini Ecosystem)

MasterGrowbot utilizes a multi-model strategy to balance performance, cost, and intelligence:

| Feature | Model | Purpose |
| :--- | :--- | :--- |
| **Plant Diagnosis** | `gemini-3-pro-preview` | High-order multimodal reasoning to analyze image bytes for pests, diseases, and stress. |
| **Live Grow Coach** | `gemini-2.5-flash-native-audio-preview-09-2025` | Real-time WebSocket connection for low-latency voice-to-voice interaction. |
| **Log Analysis** | `gemini-3-flash-preview` | Fast text summarization and trend detection in the cultivation journal. |
| **Daily Insights** | `gemini-3-flash-preview` | Generation of context-aware cultivation tips on the Home dashboard. |

---

## 🛣 Section 4: User Journey & Workflow

### 1. Onboarding & Calibration
- Users complete a 4-step interactive quiz (Experience, Environment, Goal, Space).
- The `UserProfile` is used to "prime" the AI’s system instructions, adjusting technical depth and tone.

### 2. The Dashboard (Command Center)
- Real-time plant status cards with "Health Scores" and active alerts.
- A "Daily Insight" generator that provides advice based on the plant's current life cycle stage.

### 3. Scan & Fix (The Diagnostic Loop)
- Multimodal input via native camera or gallery.
- AI returns a **Recovery Protocol**: a structured checklist of actions to save the plant.
- Result includes a **Confidence Score** and **Severity Indicator**.

### 4. Live Uplink (Voice Coaching)
- WebSocket-based audio stream allowing hands-free garden support.
- Features real-time transcription and voice settings (Calm, Bold, Synthetic, Energetic).

---

## 🏗 Section 5: Build & Deployment Rules (CRITICAL)

### Dependency Management
- **Rule:** Always use the `--legacy-peer-deps` flag when running `npm install`. This is mandatory due to compatibility requirements between React 18 and newer Capacitor/RevenueCat peer dependencies.

### Local Development Setup (Supabase)
To run the app locally, you must configure Supabase to allow `localhost` redirects:
1.  Go to your Supabase Dashboard > Authentication > URL Configuration.
2.  Add `http://localhost:5173` (or your local port) to **Redirect URLs**.
3.  Ensure your `services/supabaseClient.ts` handles the localhost environment check (see codebase).

### CI/CD & Android Builds
- **Pipeline:** Managed via **CodeMagic** (`codemagic.yaml`).
- **Environment:** Requires **Gradle 8.5** and **Java 17**.
- **Artifacts:** Deployment produces `.aab` (Android App Bundle) files for Play Store release.
- **Signing:** Release signing is handled via environment secrets for `.jks` files.

### Testing Mode
- The application is currently configured in `App.tsx` to **bypass the onboarding quiz** and use `DEFAULT_PROFILE` for immediate feature verification. To re-enable full onboarding, set `onboardingStatus` state to `OnboardingStep.SPLASH`.

---

## 📂 Section 6: Directory Structure & File Mapping

- `screens/`: Primary view containers (Home, Diagnose, Chat, Journal).
- `services/`: API wrappers for Gemini, Supabase, and RevenueCat.
- `components/`: Reusable UI modules (Growbot Mascot, Strain Cards, Navigation).
- `data/`: Static assets and the `STRAIN_DATABASE`.
- `android/`: Native Android project source (managed by Capacitor).

---

## 🤖 Phase 3: Antigravity IDE Integration

To ensure the IDE understands the project context, follow these instructions:
1. **Initialize Context:** Instruct the Agent to "Read the README.md file to understand the project architecture and build constraints before proceeding."
2. **Execute Updates:** When asking for changes, remind the Agent to adhere to the React 18 + TypeScript patterns.
3. **Verify:** Use the "Run a build verification check" prompt to catch TypeScript errors or invalid `capacitor.config.ts` modifications.
