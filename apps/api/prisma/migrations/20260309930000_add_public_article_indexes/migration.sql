-- Add indexes for public article queries (Story 8-4)

-- Primary public listing index: published articles ordered by date
CREATE INDEX IF NOT EXISTS "idx_articles_status_published_at" ON "publication"."articles" ("status", "published_at" DESC);

-- Slug lookup for published articles
CREATE INDEX IF NOT EXISTS "idx_articles_slug_status" ON "publication"."articles" ("slug") WHERE "status" = 'PUBLISHED';

-- Domain filter with published date ordering
CREATE INDEX IF NOT EXISTS "idx_articles_domain_published_at" ON "publication"."articles" ("domain", "published_at" DESC) WHERE "status" = 'PUBLISHED';
