-- Progress is written only after the Bunny Edge Function verifies active enrollment.
drop policy if exists "Users can create own video progress" on public.video_progress;
drop policy if exists "Users can update own video progress" on public.video_progress;

alter table public.video_progress drop constraint if exists video_progress_user_id_video_id_key;
alter table public.video_progress add constraint video_progress_user_course_video_key unique (user_id, course_id, video_id);
