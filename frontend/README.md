# Frontend — Q&A Data Analysis Agent

This frontend is the React + Vite client for the Q&A Data Analysis Agent.
It provides dataset selection, upload, question entry, chat-style conversation history, and result rendering for tables and charts.

## Key features

- React + Vite app with Tailwind CSS styling
- Dataset list, metadata preview, and upload support
- Natural-language question input with analysis results in a chat workflow
- Table, chart, generated code, and logs tabs for each answer
- History sidebar that replays prior questions and results
- API integration with FastAPI backend at http://localhost:8000

## Local development

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5174
```

Open http://localhost:5174 in your browser.

## Build for production

```bash
cd frontend
npm run build
```

## Runtime configuration

The frontend API client is defined in `frontend/src/services/api.js`.
It uses `import.meta.env.VITE_API_BASE_URL` when available, otherwise defaults to `http://localhost:8000`.

## Project structure

- `frontend/src/pages/Dashboard.jsx` — main application page and dataset/chat workflow
- `frontend/src/services/api.js` — backend API client
- `frontend/src/components/Sidebar/Sidebar.jsx` — dataset list, metadata, and history
- `frontend/src/components/Chat/ChatWorkspace.jsx` — message entry and result interaction
- `frontend/src/components/Message/MessageCard.jsx` — answer rendering with tabs
- `frontend/src/components/Charts/ChartViewer.jsx` — chart rendering component

## Notes

This README is intentionally focused on the actual app implementation rather than the generic Vite starter template.
