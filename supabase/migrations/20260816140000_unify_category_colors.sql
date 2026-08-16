-- Unifica a cor de cada categoria com a paleta documentada no CLAUDE.md
-- (hoje usada só para acentos de capas geradas por IA). Antes desta
-- migration, categories.color, os fallbacks do frontend e o CLAUDE.md
-- discordavam entre si para Mundo, Saúde, Música e Desporto.
update public.categories set color = 'bg-blue-600'    where slug = 'tecnologia';
update public.categories set color = 'bg-amber-600'   where slug = 'mundo';
update public.categories set color = 'bg-emerald-600' where slug = 'saude';
update public.categories set color = 'bg-violet-600'  where slug = 'musica';
update public.categories set color = 'bg-orange-600'  where slug = 'desporto';
