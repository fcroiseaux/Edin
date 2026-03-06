ALTER TABLE "core"."contributors"
ADD COLUMN "github_username" TEXT;

CREATE UNIQUE INDEX "contributors_github_username_key"
ON "core"."contributors" ("github_username");
