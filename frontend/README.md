# Barbearia Vintage — Frontend

Vite + React + TypeScript + TailwindCSS.

## Setup local

1. `npm install`
2. Copie `.env.example` para `.env` e defina `VITE_API_URL` (ex.: `http://localhost:8000`)
3. `npm run dev`

## Testes

```
npm test
```

## Deploy (Vercel)

- Root directory: `frontend`
- Preset: Vite
- Env var: `VITE_API_URL` = URL do backend no Render
- `vercel.json` reescreve todas as rotas para `index.html` (necessário para as rotas do React Router não darem 404 no refresh)
