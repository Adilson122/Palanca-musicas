# Palanca Músicas

Portal de música angolana, sem contas para visitantes e sem streaming externo.

## Ficheiros
- `index.html` — portal público, categorias, pesquisa, páginas individuais, downloads.
- `admin.html` — área privada para criar, editar e eliminar publicações e enviar capas/áudio.
- `config.js` — configuração pública do Supabase.
- `supabase/schema.sql` — esquema, políticas RLS e buckets.
- `data/posts.json` — catálogo demonstrativo, usado apenas enquanto não existir Supabase configurado.

## Colocar a funcionar
1. Criar um **novo projeto Supabase exclusivo** para Palanca Músicas. Não reutilizar bases de dados de outros produtos.
2. Executar `supabase/schema.sql` no SQL Editor do projeto.
3. Criar a conta privada do administrador em Authentication > Users.
4. Inserir o UID dessa conta na tabela `music_admins` pelo SQL Editor (conforme comentário no fim do esquema).
5. Preencher `config.js` com o Project URL e a chave **pública** publishable/anon. Não utilizar service_role.
6. Publicar o repositório na Vercel como **Other** (projeto estático, root `./`, sem build command).
7. Abrir `/admin.html` para iniciar sessão e publicar músicas com autorização.
8. Depois de configurar o catálogo, substituir/remover os conteúdos demonstrativos. Os ficheiros de música são links de download, não há player.

## Limitações atuais
- Sem Supabase configurado, o painel não publica e o portal mostra apenas modelos de publicações.
- Uploads e políticas devem ser testados no projeto Supabase escolhido antes de lançamento.
- A configuração de upload de 100 MB pode exceder os limites do plano Supabase; verificar limites do projeto.
- O botão de download aponta ao ficheiro armazenado e o comportamento de guardar ou abrir depende do navegador e dos headers do serviço.
- A remoção de uma publicação não apaga automaticamente os ficheiros do Storage; implementar limpeza de órfãos antes de uso intensivo.
- Para SEO de notícias e páginas individuais, recomenda-se gerar páginas estáticas com URLs próprios e metadados por publicação.
- Completar privacidade, termos, contactos e conteúdo editorial verdadeiro antes de solicitar monetização.
