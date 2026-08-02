# Frontend — Q&A Data Analysis Agent

This document describes the actual frontend architecture and user experience for the React + Vite application in this repo.

## Overview

The frontend is a clean, data-first React app that communicates with the FastAPI backend via the `/api/*` endpoints. It supports:
- Dataset selection and upload
- Natural-language question input
- Chat-style result presentation
- Table and chart rendering
- Generated code visibility
- Question history replay

## Local Development

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5174
```

Then open:

- `http://localhost:5174` for the React UI
- `http://localhost:8000` for the backend API

## Frontend Structure

- `frontend/src/pages/Dashboard.jsx` — main application page, dataset loading, history, and chat state
- `frontend/src/services/api.js` — backend API client
- `frontend/src/components/Sidebar/Sidebar.jsx` — dataset list, metadata, and interaction history panel
- `frontend/src/components/Chat/ChatWorkspace.jsx` — input form, messaging flow, and loading state
- `frontend/src/components/Message/MessageCard.jsx` — assistant response display and tabbed result sections
- `frontend/src/components/Charts/ChartViewer.jsx` — chart rendering and fallback chart handling

## UI Behavior

- Active dataset controls the question context.
- Uploading a new file refreshes available datasets and activates the new dataset.
- Questions are sent to `/api/query`, and the response includes answer text, table data, chart URL, generated code, and latency.
- History items can replay prior questions while preserving the current dataset if the original dataset is unavailable.
- The app renders charts from backend-served `/outputs` image URLs when available.

## Design Notes

- Light theme only, with neutral white surfaces and a single blue accent.
- Minimal, enterprise-ready interface with clean card layouts.
- Tabbed results for Summary, Table, Chart, Generated Code, and Logs.
- Subtle transitions and status messaging for better perceived performance.

## Deployment Notes

- The frontend uses `import.meta.env.VITE_API_BASE_URL` to configure its backend URL.
- If not set, it defaults to `http://localhost:8000`.
- In development, the React app runs on `http://localhost:5174`.

## Current Ports

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5174`

## Recommended README Updates

This document should be referenced by the repo README and the `frontend/README.md` to keep the developer experience aligned with the current implementation.

1. **Product Vision** — target users, personas, user goals, expectations, primary workflows
2. **Information Architecture** — full app hierarchy: navigation, sidebar, dashboard, chat workspace, results, dataset management, history, settings, user profile, error handling, empty states (with rationale per page)
3. **User Journey** — Landing → Upload dataset → Ask question → AI thinking → Results → Charts → Further questions → Export → End session, with friction points identified and resolved
4. **UX Strategy** — cognitive load, visual hierarchy, accessibility, learnability, discoverability, user confidence, feedback mechanisms, empty/loading/error/success states
5. **Layout System** — desktop/tablet/mobile layouts; grid, containers, whitespace, alignment, card system, spacing scale
6. **Component Architecture** — every reusable UI component (Navbar, Sidebar, Chat, Prompt input, Upload area, Dataset cards, Table viewer, Chart viewer, Insight cards, Filters, Buttons, Modals, Notifications, Tooltips, Code viewer, Loading skeletons, Status indicators, Progress indicators, Empty states, Error banners) — each with purpose, hierarchy, interactions, states, accessibility, consistency
7. **Design System** — typography, color palette, spacing scale, border radius, elevation, icons, illustrations, shadows, dividers, forms, tables, charts, buttons, input fields, badges, tags, chips, alerts
8. **Visual Style Guide** — primary/secondary/neutral colors, success/warning/error, typography scale, icon style, brand personality, illustration style, animation principles
9. **Interaction Design** — hover, focus states, transitions, micro-interactions, loading feedback, keyboard navigation, search, drag-and-drop, chart/table/chat interactions
10. **Dashboard Planning** — primary vs. secondary information, chart presentation, AI insight display, generated code viewing, export flow
11. **Data Visualization UX** — best practices for line/bar/pie/scatter/histogram/heatmap charts, tables, KPIs, filters, legends, tooltips, downloads, fullscreen mode
12. **Accessibility** — WCAG 2.2 compliance: keyboard accessibility, screen readers, contrast, typography, focus indicators, responsive behavior
13. **Professional Benchmarking** — comparison against ChatGPT, Claude, GitHub, Notion, Linear, Databricks, Snowflake, Tableau, Power BI (what to learn from each without copying)
14. **Frontend Architecture Planning** (no code) — folder organization, component hierarchy, state management strategy, routing strategy, API communication flow, caching strategy, performance considerations, lazy loading, reusable component philosophy, scalability principles
15. **Design Review (self-critique)** — strengths, weaknesses, potential usability problems, future improvements, scalability considerations, plus scores out of 10 for: enterprise-readiness, production-readiness, recruiter impression, client confidence, overall UX maturity

### Important Instructions (from the brief)

- Think like a senior design team, not an AI image generator
- Justify every recommendation with UX principles
- Focus on clarity, usability, accessibility, scalability, professionalism
- Prioritize long-term maintainability over visual effects
- **Do not generate HTML, CSS, JavaScript, React, Tailwind, or implementation code** for this deliverable — it is a design specification only, meant to be handed to a UI designer and frontend engineering team before development begins
