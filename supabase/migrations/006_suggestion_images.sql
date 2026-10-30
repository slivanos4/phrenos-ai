-- An image attached to a blog or LinkedIn draft (uploaded in /admin/ai-updates, stored in the
-- public ai-update-images storage bucket).
alter table public.phrenos_content_suggestions
  add column if not exists image_url text;
