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
   | `JWT_EXPIRE_MINUTES` | Tempo de expiração do access token, em minutos (padrão: `45`) |
   | `REFRESH_TOKEN_EXPIRE_DAYS` | Validade do refresh token (cookie httpOnly), em dias (padrão: `7`) |
   | `ENVIRONMENT` | `development` em dev local, `production` em produção — controla se o cookie de refresh exige HTTPS (`Secure`) |
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
   uvicorn app.main:app --reload --port 8001
   ```

   > A porta `8001` é só uma convenção deste projeto (a `8000` costuma estar ocupada por outra coisa no ambiente de dev). Pode usar outra porta livre, desde que ajuste `VITE_API_URL` no `.env` do frontend para combinar.

   A API sobe em `http://localhost:8001`. Documentação interativa (Swagger) em `http://localhost:8001/docs`.

## Testes

Os testes usam SQLite em memória (não é preciso um Postgres rodando para testar):

```bash
pytest -v
```

## Autenticação

O login usa dois tokens JWT com propósitos diferentes:

- **Access token** — curto (`JWT_EXPIRE_MINUTES`, padrão 45 min), devolvido no corpo da resposta de `/auth/login` e enviado pelo cliente em `Authorization: Bearer <token>` a cada requisição. É o que as rotas protegidas (`get_current_user`) validam.
- **Refresh token** — longo (`REFRESH_TOKEN_EXPIRE_DAYS`, padrão 7 dias), entregue em um cookie `httpOnly` (inacessível via JavaScript, protegendo contra roubo por XSS). Serve só para obter um novo access token quando o atual expira.

Endpoints envolvidos:

| Rota | O que faz |
|---|---|
| `POST /auth/login` | Autentica com e-mail/senha; devolve o access token no corpo e seta o cookie de refresh |
| `POST /auth/refresh` | Lê o cookie de refresh e devolve um novo access token (renovando o cookie a cada uso) |
| `POST /auth/logout` | Apaga o cookie de refresh |
| `GET /auth/me` | Devolve os dados do usuário autenticado (exige access token válido) |

Cada token carrega um claim `type` (`access` ou `refresh`) — um não pode ser usado no lugar do outro, mesmo que alguém consiga capturar um dos dois.

O cookie de refresh é `Secure` (exige HTTPS) e `SameSite=None` em produção, porque frontend e backend ficam em domínios diferentes (Vercel e Render). Em desenvolvimento local (`ENVIRONMENT=development`), o cookie fica `SameSite=Lax` e sem `Secure`, já que `http://localhost` não tem HTTPS.

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
