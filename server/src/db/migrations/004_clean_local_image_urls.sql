-- Remove any image URLs that are local paths (start with /uploads/)
-- These were stored before Cloudinary migration and no longer resolve
UPDATE listings
SET image_urls = ARRAY(
  SELECT u FROM unnest(image_urls) AS u WHERE u LIKE 'http%'
)
WHERE EXISTS (
  SELECT 1 FROM unnest(image_urls) AS u WHERE u NOT LIKE 'http%'
);
