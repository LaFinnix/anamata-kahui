-- =============================================================================
-- Anamata Kāhui — storage bucket MIME restrictions
-- =============================================================================
-- Restricts what file types can be uploaded to each bucket. Defence in
-- depth against stored-XSS attacks via SVG-with-embedded-JS or other
-- executable types uploaded to public buckets.
--
-- Re-runnable via supabase db push.
-- =============================================================================

-- covers: public album art — image-only
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'covers' and allowed_mime_types is null;

-- press: public press kits — images + PDFs
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf']
where id = 'press' and allowed_mime_types is null;

-- stems: private audio stems — audio formats only
update storage.buckets
set allowed_mime_types = array['audio/wav', 'audio/x-wav', 'audio/flac', 'audio/mpeg', 'audio/mp4', 'audio/aac']
where id = 'stems' and allowed_mime_types is null;

-- research: private research PDFs and docs
update storage.buckets
set allowed_mime_types = array['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
where id = 'research' and allowed_mime_types is null;

-- media: public gallery assets — image + short-form video
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm']
where id = 'media' and allowed_mime_types is null;
