# Barbearia Vintage

Sistema web de gestão para barbearias: agenda com detecção de conflito de horário, cadastro de clientes, serviços e cabeleireiros, controle de usuários com permissão de administrador, painel de faturamento e confirmação automática de agendamento por e-mail.

Projeto desenvolvido como case técnico para processo seletivo de empresa júnior.

## Demo

- **Aplicação:** https://projeto-barbearia-vintage.vercel.app
- **API (Swagger):** https://barbearia-vintage-api.onrender.com/docs

> O backend está hospedado no plano gratuito do Render, que hiberna após um período sem uso — a primeira requisição depois de um tempo ocioso pode levar alguns segundos a mais para responder.

## Funcionalidades

- **Autenticação** — login com e-mail/senha; sessão via access token (curto) + refresh token em cookie `httpOnly` (renova a sessão automaticamente sem exigir login de novo a cada recarregamento de página)
- **Agenda** — visão em lista e em grade semanal, detecção de conflito de horário considerando a duração de cada serviço, verificação de disponibilidade em tempo real ao montar um agendamento, e-mail de confirmação automático (reenviado se o horário for alterado)
- **Clientes** — cadastro, edição, busca por nome, remoção (soft delete — o histórico de atendimentos é preservado)
- **Serviços** — cadastro com duração e preço, ativar/desativar
- **Cabeleireiros** — cadastro, edição e remoção
- **Usuários e permissões** — apenas administradores podem gerenciar outros usuários da equipe
- **Dashboard** — atendimentos do dia e da semana, serviços mais procurados; para administradores, também o faturamento da semana por cabeleireiro e um painel de "Visão geral" com o histórico das últimas 8 semanas e o faturamento do mês
- **Responsivo** — adaptado para uso em celular

## Stack técnica

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — framework web assíncrono
- [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (async) + [asyncpg](https://github.com/MagicStack/asyncpg) — acesso ao banco
- [PostgreSQL](https://www.postgresql.org/)
- [Alembic](https://alembic.sqlalchemy.org/) — migrações de banco versionadas
- JWT (`python-jose`) + `bcrypt` (`passlib`) — autenticação e hash de senha
- `slowapi` — rate limiting no login
- `pytest` + `httpx` — testes de integração

**Frontend**
- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — build e dev server
- [TailwindCSS](https://tailwindcss.com/) — design system utilitário (ver `frontend/src/styles/theme.css`)
- [TanStack Query](https://tanstack.com/query) — cache e sincronização de dados do servidor
- [React Router](https://reactrouter.com/) — rotas e proteção de acesso
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) — validação do formulário de login
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) — testes

**Integrações**
- [n8n](https://n8n.io/) — roda de forma independente do backend, conectado diretamente ao banco (Neon/Postgres): consulta periodicamente por agendamentos com `confirmation_email_sent = false` e dispara o e-mail de confirmação ao cliente

**Infraestrutura**
- [Render](https://render.com/) — hospedagem do backend, com deploy automático a partir do GitHub
- [Vercel](https://vercel.com/) — hospedagem do frontend, com deploy automático a partir do GitHub

## Arquitetura

```
┌─────────────┐        REST/JSON        ┌──────────────┐        SQL        ┌────────────┐
│   Frontend   │ ──────────────────────▶ │   Backend    │ ─────────────────▶ │ PostgreSQL │
│ React (Vercel)│ ◀────────────────────── │ FastAPI (Render)│ ◀───────────────── │  (Neon)    │
└─────────────┘        JWT no header     └──────────────┘                    └─────┬──────┘
                                                                                     │ SQL (leitura/escrita direta)
                                                                                     ▼
                                                                              ┌─────────────┐
                                                                              │     n8n      │ ──▶ e-mail de confirmação
                                                                              └─────────────┘
```

Frontend e backend são projetos independentes que só se comunicam por HTTP — cada um tem seu próprio `README` com instruções de execução. O n8n roda à parte, sem se comunicar com o backend: ele mesmo consulta e atualiza o banco.

## Como rodar localmente

O projeto tem duas partes que rodam separadamente e precisam estar ativas ao mesmo tempo:

1. **[backend/README.md](./backend/README.md)** — configurar `.env`, instalar dependências, rodar migrações e subir a API em `http://localhost:8001`
2. **[frontend/README.md](./frontend/README.md)** — configurar `.env` (apontando para a API acima), instalar dependências e subir a interface em `http://localhost:5173`

## Testes

```bash
# backend (65 testes)
cd backend && pytest -v

# frontend (68 testes)
cd frontend && npm test
```

## Estrutura do repositório

```
backend/          API REST (FastAPI)
frontend/         Interface web (React)
docs/             Documentação adicional do projeto
```

## Segurança e boas práticas

- Senhas armazenadas com hash `bcrypt`, nunca em texto plano
- Access token JWT (HS256), curto (padrão 45 min), mantido em memória no frontend (não em `localStorage`), reduzindo exposição a XSS
- Refresh token em cookie `httpOnly` (inacessível via JavaScript), usado para renovar a sessão sem exigir login de novo enquanto o usuário estiver ativo; access e refresh token carregam um claim de tipo próprio, então um não pode ser usado no lugar do outro
- Controle de acesso por papel (`is_admin`) validado sempre no backend — o frontend só evita renderizar telas que a API recusaria
- Rate limiting no endpoint de login contra força bruta
- CORS restrito a uma lista explícita de origens permitidas
- Nenhuma credencial, segredo ou URL de conexão fica no código-fonte — tudo vem de variáveis de ambiente, com `.env.example` documentando quais variáveis existem (sem valores reais) e `.env` no `.gitignore`

## Fluxo de branches e deploy

- `main` — produção; Render e Vercel observam essa branch e fazem deploy automático a cada push
- `develop` — branch de integração, onde o trabalho é validado antes de ir para produção
- `feat/*`, `fix/*` — branches de trabalho isoladas por funcionalidade, mescladas em `develop` e depois em `main`

## Licença

Projeto desenvolvido para fins de avaliação em processo seletivo. Sem licença de uso definida.
