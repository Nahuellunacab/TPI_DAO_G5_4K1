GoField React frontend (Vite)

Quick start
1. Ensure Node.js (>=16) and npm are installed.
2. From the `frontend-react/` directory run:

```powershell
npm install
npm run dev
```

This starts the dev server at http://localhost:5173 and proxies `/api` to `http://localhost:5000` (your Flask backend).

Files created
- `src/` - React source
  - `pages/Home.jsx` - Home page
  - `pages/Login.jsx` - Login page
  - `App.jsx`, `main.jsx` - app wiring
  - `styles.css` - shared styles (uses the color palette you provided)
- `public/assets/` - place `logo.png` and `hero.jpg` here to use your images
- `vite.config.js` - dev server proxy to Flask

Notes
- The login and reserve actions are placeholders; when you have backend endpoints I can wire them (POST /api/login, POST /api/reservas, etc.).
- If you prefer the React app in `frontend/` instead of `frontend-react/` I can move it.
