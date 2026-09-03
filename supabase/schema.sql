-- 카드뉴스 스튜디오: Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 그대로 실행하세요.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  persona jsonb not null default '{}'::jsonb,
  topic text not null default '',
  card_count int not null default 6,
  size_key text not null default 'square',
  art_style text not null default 'flat',
  quality text not null default 'medium',
  use_character boolean not null default false,
  character_source_url text,
  character_sheet_url text,
  character_description text,
  design jsonb not null default '{}'::jsonb,
  cards jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects for select to authenticated using (auth.uid() = user_id);
drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects for delete to authenticated using (auth.uid() = user_id);

-- 이미지 저장용 공개 버킷 (경로: {user_id}/{project_id}/...)
insert into storage.buckets (id, name, public)
values ('cardnews', 'cardnews', true)
on conflict (id) do update set public = true;

drop policy if exists "cardnews_public_read" on storage.objects;
create policy "cardnews_public_read" on storage.objects for select using (bucket_id = 'cardnews');
drop policy if exists "cardnews_owner_insert" on storage.objects;
create policy "cardnews_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'cardnews' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "cardnews_owner_update" on storage.objects;
create policy "cardnews_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'cardnews' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "cardnews_owner_delete" on storage.objects;
create policy "cardnews_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'cardnews' and (storage.foldername(name))[1] = auth.uid()::text);
