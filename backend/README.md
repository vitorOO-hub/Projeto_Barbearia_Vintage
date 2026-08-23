# Barbearia Vintage — Backend

API REST em **FastAPI** com **SQLAlchemy assíncrono**, banco **PostgreSQL** e migrações via **Alembic**.

## Pré-requisitos

- Python 3.12 ou superior
- Um banco PostgreSQL acessível (local, Docker, ou um serviço gerenciado como [Neon](https://neon.tech))

## Configuração local

1. Crie e ative um ambiente virtual, a partir da pasta `backend/`:

   ```bash
   python -m venv .venv
   # Windows (PowerShell)
   .venv\Scripts\Activate.ps1
   # Linux/macOS
   source .venv/bin/activate
   ```

2. Instale as dependências (inclui as de teste):

   ```bash
   pip install -r requirements-dev.txt
   ```

3. Copie o arquivo de exemplo de variáveis de ambiente e preencha com os **seus próprios** valores:

   ```bash
   cp .env.example .env
   ```

   | Variável | Descrição |
   |---|---|
   | `DATABASE_URL` | String de conexão assíncrona do Postgres (`postgresql+asyncpg://...`) |
   | `JWT_SECRET` | Segredo usado para assinar os tokens JWT — gere um valor aleatório longo, nunca reaproveite o do exemplo |
   | `JWT_EXPIRE_MINUTES` | Tempo de expiração do token de login, em minutos (padrão: `45`) |
   | `N8N_WEBHOOK_URL` | URL do webhook do n8n que envia o e-mail de confirmação de agendamento (opcional em dev) |
   | `N8N_SHARED_SECRET` | Segredo enviado no header `X-Webhook-Secret` para o n8n validar a origem da chamada |
   | `ALLOWED_ORIGINS` | Lista de origens permitidas por CORS, separadas por vírgula (ex.: `http://localhost:5173`) |

   > **Nunca** commite o arquivo `.env` — ele já está no `.gitignore`. As credenciais de produção ficam só nas variáveis de ambiente do serviço de deploy.

4. Aplique as migrações do banco:

   ```bash
   alembic upgrade head
   ```

5. (Opcional) Popule o banco com um usuário inicial e os serviços padrão da barbearia — o script pergunta os dados interativamente, nenhuma credencial fica no código:

   ```bash
   python scripts/seed.py
   ```

6. Suba o servidor de desenvolvimento (com auto-reload):

   ```bash
   uvicorn app.main:app --reload
   ```

   A API sobe em `http://localhost:8000`. Documentação interativa (Swagger) em `http://localhost:8000/docs`.

## Testes

Os testes usam SQLite em memória (não é preciso um Postgres rodando para testar):

```bash
pytest -v
```

## Migrações (Alembic)

Depois de alterar um model em `app/models/`, gere a migração correspondente:

```bash
alembic revision --autogenerate -m "descricao_da_mudanca"
alembic upgrade head
```

Revise sempre o arquivo gerado em `alembic/versions/` antes de aplicar — o autogenerate não é infalível para todos os tipos de mudança (ex.: renomear uma coluna aparece como drop + add).

## Estrutura

```
app/
  api/v1/          # rotas HTTP (um arquivo por recurso)
  core/            # configuração (env vars) e segurança (hash de senha, JWT)
  db/              # engine e sessão do SQLAlchemy
  integrations/    # chamada ao webhook do n8n
  models/          # tabelas (SQLAlchemy ORM)
  schemas/         # validação de entrada/saída (Pydantic)
alembic/versions/  # histórico de migrações do banco
tests/             # testes de integração (httpx + SQLite em memória)
scripts/seed.py    # popula um usuário inicial e os serviços padrão
```

## Deploy (Render)

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Pre-deploy command: `alembic upgrade head` (garante que o banco de produção sempre tenha o schema mais recente antes da nova versão da API entrar no ar)
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET`, `N8N_WEBHOOK_URL`, `N8N_SHARED_SECRET`, `ALLOWED_ORIGINS`) são preenchidas direto no painel do Render — nunca no repositório.

Configuração completa em [`render.yaml`](./render.yaml).
