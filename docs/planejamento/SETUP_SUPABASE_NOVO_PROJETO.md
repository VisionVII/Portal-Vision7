# Setup do novo projeto Supabase

## Passos rápidos

1. Abra o **SQL Editor** do novo projeto Supabase.
2. Execute o conteúdo de `supabase/bootstrap_new_project.sql`.
3. Confirme que as tabelas foram criadas: `categories`, `posts`, `user_roles`, `site_settings`, `newsletter_subscribers`, `podcasts`, `courses`.
4. Faça login administrativo em `/acesso/admin/controlado`.
5. Para acessos de equipa/parceria, use `/validar/entrada/tipodeuser` após convite aprovado.
6. No primeiro acesso autenticado, o sistema tenta fazer o **bootstrap do primeiro admin** automaticamente.

## Projeto atual

- `project_id` configurado: `stpusdeqwbckvfsitsld`
- Frontend já apontado para o novo `VITE_SUPABASE_URL` no `.env`

## Observação

Se o banco ainda estiver vazio, o frontend agora usa fallbacks locais para posts/categorias até o schema ser aplicado.
