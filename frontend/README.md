# Barbearia Vintage — Frontend

SPA em **React + TypeScript**, construída com **Vite** e estilizada com **TailwindCSS**.

## Pré-requisitos

- Node.js 20 ou superior
- O [backend](../backend/README.md) rodando (local ou apontando para uma API já publicada) — o frontend não funciona sozinho, ele consome a API REST

## Configuração local

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de exemplo de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

   | Variável | Descrição |
   |---|---|
   | `VITE_API_URL` | URL base da API do backend (ex.: `http://localhost:8001` em dev) |

   > Confirme que a porta em `VITE_API_URL` é a mesma em que o backend está rodando — se um dos dois lados mudar de porta, ajuste o `.env` correspondente. O `.env` nunca deve ser commitado (já está no `.gitignore`).

3. Suba o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   A aplicação abre em `http://localhost:5173` (porta fixa, configurada em `vite.config.ts`).

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento com hot reload |
| `npm run build` | Type-check (`tsc -b`) + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção localmente, para conferir antes de publicar |
| `npm test` | Roda a suíte de testes (Vitest + Testing Library) |
| `npm run test:watch` | Roda os testes em modo watch |
| `npm run lint` | Lint com `oxlint` |

## Testes

```bash
npm test
```

Os componentes de página têm o `apiClient` (Axios) mockado nos testes — nenhuma chamada de rede real acontece, e nenhuma credencial é necessária para rodar a suíte.

## Estrutura

```
src/
  api/          # um arquivo por recurso, encapsulando as chamadas Axios
  components/   # modais e componentes reutilizáveis entre páginas
  context/      # autenticação (AuthContext) e notificações (ToastContext)
  lib/          # formatação de datas/moeda, utilitários de semana/grade
  pages/        # uma tela por rota
  routes/       # ProtectedRoute (exige login) e AdminRoute (exige is_admin)
  styles/       # design system central (theme.css)
```

## Login para testar localmente

Não existe usuário/senha padrão no código — crie o primeiro usuário rodando `python scripts/seed.py` no backend (ele pede os dados interativamente) e use essas credenciais para entrar.

## Sessão (access + refresh token)

O `apiClient` (`src/api/client.ts`) guarda o access token em memória (nunca em `localStorage`) e envia `withCredentials: true` em toda requisição, para que o cookie `httpOnly` de refresh — setado pelo backend no login — seja enviado automaticamente. Isso significa:

- Ao recarregar a página, o `AuthContext` chama `POST /auth/refresh` antes de `/auth/me` para restaurar a sessão a partir do cookie, sem precisar logar de novo.
- Qualquer requisição que receba `401` dispara uma tentativa automática de renovar o access token e repete a chamada original uma vez.
- Rodando o backend localmente, o cookie exige que `ENVIRONMENT=development` esteja configurado no `.env` do backend — sem isso, o navegador recusa aceitar o cookie `Secure` sobre `http://localhost`.

## Deploy (Vercel)

- Root directory: `frontend`
- Framework preset: **Vite**
- Variável de ambiente: `VITE_API_URL` = URL pública do backend em produção (Render)
- `vercel.json` reescreve todas as rotas para `index.html`, necessário para as rotas do React Router não retornarem 404 ao dar refresh na página
