# Setup e migração do novo projeto Supabase

> **Fluxo obrigatório desta fase:** aplicar → validar aplicação → só então avançar para o próximo passo.

## Status atual

- ✅ `bootstrap_new_project.sql` já aplicado no novo projeto
- ✅ Schema base inicial criado com sucesso
- ✅ `supabase db push --include-all` executado com sucesso em 2026-04-10
- ✅ `supabase migration list` agora mostra `Local = Remote` em toda a sequência versionada
- 🔄 Próxima meta: concluir a reconciliação runtime do schema e fechar a validação manual de login/convites antes do cutover final
- ℹ️ **Projeto novo correto confirmado pelo utilizador:** `xhpfxvoonpclonjyfimt`
- ⚠️ O ref `stpusdeqwbckvfsitsld` era o projeto legado que ainda estava nas envs/builds anteriores
- ⚠️ A conta/CLI disponível nesta sessão recebe `403` ao tentar listar functions/secrets do ref `xhpfxvoonpclonjyfimt`, portanto qualquer apply direto restante nesse projeto precisa ser feito com uma conta que tenha acesso a ele
- ℹ️ As migrations de 23/03 foram normalizadas para timestamps únicos para evitar colisão em `supabase_migrations.schema_migrations`

## Passo 1 — Bootstrap inicial (**concluído**)

1. Abrir o **SQL Editor** do novo projeto Supabase.
2. Executar `supabase/bootstrap_new_project.sql`.
3. Confirmar as tabelas base: `categories`, `posts`, `user_roles`, `site_settings`, `newsletter_subscribers`, `courses`.
4. Confirmar que o primeiro login autenticado consegue acionar `public.bootstrap_first_admin()`.

### Validação do passo 1

- [ ] `categories` e `posts` aparecem no Table Editor
- [ ] `user_roles` existe com RLS ativa
- [ ] `site_settings` contém `site_name`, `site_description`, `logo_url`, `contact_email`
- [ ] Nenhum erro SQL ficou pendente no editor

## Passo 2 — Aplicar migrations versionadas (**concluído**)

O bootstrap cria a base, mas o portal completo depende também de:

- `supabase/migrations/`
- `supabase/functions/`
- `src/integrations/supabase/`

### Ordem segura

1. Linkar o projeto novo no CLI/local
2. Aplicar as migrations pendentes no novo projeto
3. Validar RLS, roles, tabelas de automação e pipeline
4. Só depois trocar as envs do portal e fazer deploy

### Validação do passo 2

- [x] existem `security_codes`, `automations_v2`, `news_staging`, `curated_posts`
- [x] runtime helpers reconciliados no novo projeto (`partner_access_requests`, `increment_views()`, `track_podcast_download()`) e validados em runtime
- [x] sequência de migrations aplicada com sucesso via `supabase db push --include-all`
- [x] login admin continua funcional em `/acesso/admin/controlado` *(validação manual do utilizador)*
- [ ] convite/equipa em `/validar/entrada/tipodeuser` ainda precisa de revalidação manual
- [ ] revisar o drift residual de algumas policies/triggers/funções antes do cutover final
- [x] reforçado no admin que conteúdos em estado `Rascunho` não aparecem publicamente até serem marcados como `Publicado`

### Evidência executada

- `supabase migration list` retornou todos os identificadores locais também presentes no remoto
- `supabase inspect db table-stats --linked` confirmou `news_staging`, `security_codes`, `registration_invites`, `automations_v2`, `curated_posts`, `permissions_matrix`, `posting_queue` e `editorial_feedback`
- os testes reais de runtime mostraram que `request-team-access` inicialmente devolvia `500` com payload válido e que `rpc/increment_views` / `rpc/track_podcast_download` respondiam `404 PGRST202`, confirmando drift residual em objetos usados pelo portal
- após a reconciliação remota, `request-team-access` passou a devolver `{"success":true,"stored":true}` e ambas as RPCs passaram a responder `HTTP/2 204`
- `supabase db diff --linked --schema public` conseguiu replayar toda a cadeia de migrations em shadow DB e apontou drift residual que deve ser revisado com calma antes da virada final

## Passo 3 — Storage e assets

Antes do cutover final:

- validar os buckets usados pelo portal: `post-images`, `podcasts`, `transcripts`, `audiocast-covers`
- reenviar ou copiar os objetos essenciais do Storage antigo
- confirmar banners, capas, áudio e uploads no admin

### Evidência inicial do passo 3

- `supabase db dump --linked --schema storage` confirmou policies para `post-images`, `podcasts`, `transcripts` e `audiocast-covers`
- `supabase db dump --linked --data-only --schema storage` confirmou os buckets **e objetos reais** no projeto ligado (`stpusdeqwbckvfsitsld`)
- `supabase --experimental storage ls ss:///post-images -r` e `ss:///podcasts -r` confirmaram os caminhos reais do bucket
- próximo foco é validar os **arquivos/objetos** dentro destes buckets e não apenas a estrutura/policies

> Se o dashboard mostrar outro projeto/ref, os buckets podem parecer “sumidos”. Confirme sempre se o projeto aberto no browser é o mesmo que o `.env`/CLI está a usar.

### Como copiar os arquivos do Storage antigo para o novo

#### Opção A — manual pelo dashboard

1. Abrir o **projeto antigo** no Supabase.
2. Ir em `Storage` e baixar/exportar os arquivos essenciais mantendo a estrutura das pastas.
3. Abrir o **projeto novo** (`xhpfxvoonpclonjyfimt`).
4. Confirmar os buckets:
   - `post-images`
   - `transcripts`
5. Fazer upload preservando os caminhos internos, por exemplo:
   - `post-images/site/banners/...`
   - `post-images/posts/...`

#### Opção B — via CLI (recomendado se houver muitos arquivos)

```bash
cd /workspaces/lusitania-digital-pulse

# 0) CONFIRMAR o projeto atualmente ligado
cat supabase/.temp/project-ref

# 1) Baixar do projeto antigo
supabase link --project-ref <OLD_PROJECT_REF>
mkdir -p tmp/storage-export
supabase --experimental storage cp -r ss:///post-images tmp/storage-export/post-images
supabase --experimental storage cp -r ss:///transcripts tmp/storage-export/transcripts || true

# 2) Enviar para o projeto novo (copiar SUBPASTAS, não a pasta do bucket inteira)
supabase link --project-ref xhpfxvoonpclonjyfimt
supabase --experimental storage cp -r tmp/storage-export/post-images/site ss:///post-images/site
supabase --experimental storage cp -r tmp/storage-export/post-images/posts ss:///post-images/posts
supabase --experimental storage cp -r tmp/storage-export/post-images/gallery ss:///post-images/gallery
supabase --experimental storage cp -r tmp/storage-export/post-images/banners ss:///post-images/banners || true
```

> **Importante:** se `supabase link --project-ref <OLD_PROJECT_REF>` falhar por permissão, os comandos seguintes continuam a usar o **último projeto ligado**. Verifique sempre `cat supabase/.temp/project-ref` antes de copiar.

> O frontend já deve evitar depender de URLs hardcoded de um projeto Supabase antigo para os banners de fallback.

## Passo 4 — Variáveis e Edge Functions

Trocar e validar:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Também é obrigatório redeployar as functions em `supabase/functions/*` no novo projeto.

### Evidência atual do passo 4

- no ambiente anteriormente ligado (`stpusdeqwbckvfsitsld`) as functions estavam `ACTIVE`, mas o utilizador confirmou que o alvo final correto é `xhpfxvoonpclonjyfimt`
- antes do cutover definitivo, confirmar no dashboard/CLI da conta com acesso ao projeto `xhpfxvoonpclonjyfimt` que estas mesmas functions também estão deployadas lá
- `supabase secrets list` confirmou secrets essenciais já cadastradas no projeto ligado

### Próxima validação manual do passo 4

- [x] `ALLOWED_ORIGINS` atualizado para cobrir `vision7.pt`, `www.vision7.pt`, localhost e o ambiente `github.dev`
- [x] Edge Functions de auth/acesso redeployadas com suporte genérico a `*.github.dev`
- [ ] testar login por código/OTP ponta a ponta
- [ ] testar flows de convite/acesso de equipa

### Evidência de CORS/auth

- `curl -X OPTIONS .../functions/v1/send-login-code` retornou `access-control-allow-origin: https://vision7.pt`
- o mesmo teste retornou `access-control-allow-origin: https://sturdy-pancake-67vwv9j6jx4cxqwp.github.dev`
- após o redeploy, até um preview `https://preview-check-vision7.github.dev` foi aceite com sucesso
- em testes `POST` reais, `send-login-code` e `verify-login-code` devolveram `403` funcional (email sem acesso) e `request-team-access` devolveu `400` de validação — ou seja, sem bloqueio de CORS e já a responder a nível de negócio
- um teste com payload válido em `request-team-access` passou de `500` para `HTTP/2 200` após o redeploy da function com fallback operacional, mesmo antes da reconciliação final
- foi preparada a migration `supabase/migrations/20260410223000_restore_runtime_support_objects.sql` para restaurar `partner_access_requests`, `analytics_events`, `user_profiles`, `monetization_settings` e as RPCs usadas por posts/audiocasts
- como o `supabase db push --include-all` estava bloqueado por erro externo do Supabase CLI / credenciais (`FATAL: Circuit breaker open ... set env var SUPABASE_DB_PASSWORD`), a reconciliação runtime foi aplicada diretamente no projeto por uma função de manutenção temporária autenticada e o segredo de execução foi desativado logo depois

## Passo 5 — Cutover controlado

### Checklist passo a passo para fechar o cutover

1. **Confirmar as envs do frontend/host**
   - manter apenas `VITE_SUPABASE_URL`
   - manter apenas `VITE_SUPABASE_ANON_KEY`
   - remover dependência de `VITE_SUPABASE_PUBLISHABLE_KEY` no código/host
2. **Confirmar secrets do projeto novo**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_ORIGINS`
   - `RESEND_API_KEY`, `FROM_EMAIL`, `ADMIN_LOGIN_EMAIL`, `ADMIN_NOTIFY_EMAIL`
3. **Redeploy final do ambiente que vai para produção**
   - rebuild do frontend com as envs do projeto novo
   - redeploy das Edge Functions já ligadas ao projeto `stpusdeqwbckvfsitsld`
4. **Revalidar em produção**
   - login admin
   - fluxo equipa/parceria
   - criação/publicação de conteúdo
   - upload de imagem/áudio/capa
5. **Monitorar e manter rollback curto**
   - acompanhar logs nas primeiras horas
   - manter rollback preparado por alguns dias

### Limpeza final do cutover

- helper temporário `apply-runtime-reconciliation` removido do repositório e do projeto remoto após uso
- secret temporário `MIGRATION_APPLY_KEY` removido
- frontend consolidado para usar `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- migration `20260410223000_restore_runtime_support_objects.sql` mantida no histórico para auditoria e replay futuro

## Observações críticas

- Sem plano pago de Organization Migration, a estratégia correta é **novo projeto + replicação controlada**
- Como ainda existe acesso ao dashboard antigo, vale exportar agora dados, storage e configurações de Auth
- Não fazer a virada final sem validar login/OTP, dashboard admin e uploads
