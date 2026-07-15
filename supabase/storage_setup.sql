-- Supabase SQL Editor에 붙여넣고 실행하세요.
-- 담벼락(wall) 이미지 업로드용 Storage 버킷 생성 + 공개 읽기/업로드 정책.
--
-- (대시보드에서 직접 만들고 싶다면: Storage → New bucket → 이름 "wall" →
--  Public bucket 체크 → Create. 이 경우에도 아래 정책 두 개는 별도로 필요합니다.)

insert into storage.buckets (id, name, public)
values ('wall', 'wall', true)
on conflict (id) do nothing;

create policy "Public read access for wall bucket"
  on storage.objects for select
  using (bucket_id = 'wall');

create policy "Anyone can upload to wall bucket"
  on storage.objects for insert
  with check (bucket_id = 'wall');
