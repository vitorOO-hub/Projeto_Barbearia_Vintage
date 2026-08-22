# Barbearia Vintage — Backend

FastAPI + PostgreSQL (Neon) + Alembic.

## Setup local

1. `python -m venv .venv && .venv\Scripts\Activate.ps1` (Windows) ou `source .venv/bin/activate` (Unix)
2. `pip install -r requirements-dev.txt`
3. Copie `.env.example` para `.env` e preencha as variáveis
4. `alembic upgrade head` (após a Task de migrations existir)
5. `uvicorn app.main:app --reload`
6. Docs interativas: http://localhost:8000/docs

## Testes

```
pytest -v
```

## Deploy (Render)

- Root directory: `backend`
- Free tier cold start mitigation: agendamento externo faz `GET /health` a cada 10 minutos (ver `n8n/` ou UptimeRobot configurado).
- Rodar `alembic upgrade head` antes do primeiro deploy.
