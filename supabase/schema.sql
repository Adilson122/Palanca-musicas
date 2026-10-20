-- Execute apenas num projeto Supabase dedicado ao Palanca Músicas.
create extension if not exists pgcrypto;
create table if not exists public.music_admins(user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.music_posts(
 id uuid primary key default gen_random_uuid(),
 slug text unique not null,
 title text not null check(length(title) between 1 and 160),
 artist text not null check(length(artist) between 1 and 160),
 genre text not null,
 type text not null,
 description text not null default '',
 cover text,
 audio_url text,
 status text not null default 'draft' check(status in ('draft','published')),
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.music_admins enable row level security;
alter table public.music_posts enable row level security;
revoke all on public.music_admins from anon, authenticated;
grant select on public.music_admins to authenticated;
grant select on public.music_posts to anon, authenticated;
grant insert,update,delete on public.music_posts to authenticated;
create policy "Admin reads own membership" on public.music_admins for select to authenticated using(user_id=(select auth.uid()));
create policy "Visitors read published posts" on public.music_posts for select to anon,authenticated using(status='published' or exists(select 1 from public.music_admins a where a.user_id=(select auth.uid())));
create policy "Admin creates posts" on public.music_posts for insert to authenticated with check(exists(select 1 from public.music_admins a where a.user_id=(select auth.uid())));
create policy "Admin updates posts" on public.music_posts for update to authenticated using(exists(select 1 from public.music_admins a where a.user_id=(select auth.uid()))) with check(exists(select 1 from public.music_admins a where a.user_id=(select auth.uid())));
create policy "Admin deletes posts" on public.music_posts for delete to authenticated using(exists(select 1 from public.music_admins a where a.user_id=(select auth.uid())));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('music-covers','music-covers',true,8388608,array['image/jpeg','image/png','image/webp']),
('music-audio','music-audio',true,104857600,array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/mp4','audio/aac','audio/ogg','audio/flac','audio/x-flac'])
on conflict(id) do nothing;
create policy "Public covers read" on storage.objects for select to anon,authenticated using(bucket_id='music-covers');
create policy "Public music read" on storage.objects for select to anon,authenticated using(bucket_id='music-audio');
create policy "Admin upload covers" on storage.objects for insert to authenticated with check(bucket_id='music-covers' and exists(select 1 from public.music_admins a where a.user_id=(select auth.uid())));
create policy "Admin upload music" on storage.objects for insert to authenticated with check(bucket_id='music-audio' and exists(select 1 from public.music_admins a where a.user_id=(select auth.uid())));
-- Depois de criar um utilizador no Authentication, adicionar o seu UID como admin
-- pelo SQL Editor: insert into public.music_admins(user_id) values ('UID-DO-ADMIN');
