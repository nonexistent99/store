# Vento Marketplace

SaaS de marketplace em **Next.js 14 (App Router)**, TypeScript e Tailwind CSS. O frontend, as APIs e a persistência local ficam no mesmo projeto; não há ORM nem banco externo.

## Rodar localmente

1. Copie `.env.example` para `.env.local`.
2. Defina `ADMIN_PASSWORD` e uma `ADMIN_SESSION_SECRET` longa e aleatória.
3. Instale e inicie:

   ```bash
   npm install
   npm run dev
   ```

4. Acesse `http://localhost:3000` e entre em `/admin` com a senha configurada.

Validações disponíveis:

```bash
npm run typecheck
npm run build
```

## Publicar na Netlify

1. Crie um repositório remoto no GitHub, GitLab ou Bitbucket e envie este projeto.
2. No painel da Netlify, escolha **Add new site → Import an existing project** e selecione o repositório.
3. A Netlify reconhecerá `netlify.toml`; use `npm run build` como comando de build.
4. Em **Site configuration → Environment variables**, cadastre `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` e, se preferir, as variáveis opcionais de Discord/Pushcut do `.env.example`.

> **Importante:** este projeto usa arquivos JSON locais em `data/`. A Netlify executa as APIs como funções serverless, cujo sistema de arquivos não é persistente. A vitrine pode ser publicada, mas pedidos, produtos e configurações gravados durante a execução não sobrevivem de forma confiável. Para uma operação real na Netlify, substitua `lib/storage.ts` por um armazenamento persistente (por exemplo, Netlify Blobs, Supabase ou outro banco) antes de processar pedidos reais.

## Configuração

| Configuração | Onde definir | Observação |
| --- | --- | --- |
| Senha inicial | `ADMIN_PASSWORD` em `.env.local` | Depois de salvar uma nova senha no painel, ela passa a ter prioridade e fica em `data/settings.json`. |
| Cookie do admin | `ADMIN_SESSION_SECRET` em `.env.local` | Obrigatória em produção; use uma sequência longa e aleatória. |
| Discord | Painel `/admin` → Configurações ou `DISCORD_WEBHOOK_URL` | Informe uma URL de webhook HTTPS de um canal. |
| Pushcut | Painel `/admin` → Configurações ou `PUSHCUT_URL` + `PUSHCUT_API_KEY` | Use uma URL como `https://api.pushcut.io/v1/notifications/NomeDaNotificacao`. |

Campos salvos pelo painel têm prioridade sobre as variáveis de ambiente. As integrações são opcionais: se uma URL estiver vazia, ela será ignorada no pedido.

## Rotas

- `/` — vitrine pública com catálogo, carrinho e checkout.
- `/admin` — área protegida por senha para produtos, pedidos, identidade da loja e integrações.
- `/marketplace/meus-pedidos` — histórico do cliente neste dispositivo e estrutura visual reservada para chat.

## APIs

| Método e rota | Função |
| --- | --- |
| `POST /api/admin/login` | Cria a sessão administrativa HTTP-only. |
| `POST /api/admin/logout` | Encerra a sessão. |
| `GET /api/admin/session` | Informa se existe sessão válida. |
| `GET /api/products` | Catálogo público e identidade da loja. |
| `POST /api/products` | Cria produto (admin). |
| `PUT` / `DELETE /api/products/:id` | Atualiza ou remove produto (admin). |
| `POST /api/orders` | Valida carrinho, cria pedido JSON e dispara as notificações. |
| `GET /api/orders?customerToken=...` | Retorna somente pedidos daquele dispositivo. |
| `GET /api/orders?scope=admin` | Lista pedidos para o painel autenticado. |
| `GET` / `PUT /api/settings` | Lê e atualiza configurações (admin). |

O carrinho envia apenas IDs e quantidades; preço, nome e total são recalculados no servidor a partir de `data/products.json`.

## Persistência JSON

Os arquivos são criados com exemplos mínimos e podem ser revisados diretamente:

- `data/products.json`
- `data/orders.json`
- `data/settings.json`

As gravações usam arquivo temporário seguido de rename, reduzindo o risco de arquivo parcial em uma interrupção. Esse modelo é apropriado para execução local, protótipos e servidores com disco persistente. Para ambientes serverless/replicados, substitua a camada de `lib/storage.ts` por armazenamento persistente compartilhado.

## Notificações e próximos passos

Após cada pedido gravado, `lib/notifications.ts` envia:

- um embed formatado ao webhook do Discord, com ID, comprador, itens e total;
- um `POST` ao endpoint Pushcut com `API-Key`, quando configurada.

O ponto de expansão de chat está marcado como `TODO(chat)` em `components/order-history.tsx`. Um provedor futuro deve usar o ID do pedido como chave de conversa, sem expor o token que separa os pedidos do cliente.
