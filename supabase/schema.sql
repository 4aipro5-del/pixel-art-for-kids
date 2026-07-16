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

-- "이어서 그리기(Resume)" 기능이 기존 행을 update로 덮어쓸 수 있어야 하므로 추가.
-- 이 앱엔 실제 로그인/인증이 없어(이름만 입력) select/insert 정책과 동일하게 permissive하게
-- 열어둔다 — 클라이언트는 항상 자기 user_name으로 좁힌 목록에서 고른 작품의 id로만 update를
-- 호출하지만, DB 차원에서 다른 사용자의 행을 절대 못 바꾸게 강제하는 건 아니라는 점은 유의.
create policy "Anyone can update artworks"
  on public.artworks for update
  using (true)
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
