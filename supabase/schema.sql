-- Supabase SQL Editor에 붙여넣고 실행하세요.
-- artworks: 픽셀아트 작품 저장(개인 갤러리) / posts: 담벼락 게시글(이미지 URL)

-- ── artworks ─────────────────────────────────────────────────────────
create table if not exists public.artworks (
  id bigint generated always as identity primary key,
  user_name text not null,
  pixels jsonb not null,       -- 2D 배열(행 x 열, 각 칸은 색상 hex 문자열 또는 null)을 그대로 저장
  cols integer not null,
  rows integer not null,
  created_at timestamptz not null default now()
);

create index if not exists artworks_created_at_idx
  on public.artworks (created_at desc);

alter table public.artworks enable row level security;

create policy "Anyone can view artworks"
  on public.artworks for select
  using (true);

create policy "Anyone can insert artworks"
  on public.artworks for insert
  with check (true);

-- ── posts (담벼락) ────────────────────────────────────────────────────
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  user_name text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

alter table public.posts enable row level security;

create policy "Anyone can view posts"
  on public.posts for select
  using (true);

create policy "Anyone can insert posts"
  on public.posts for insert
  with check (true);
