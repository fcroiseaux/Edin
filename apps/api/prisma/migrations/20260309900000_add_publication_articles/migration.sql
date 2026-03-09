-- CreateEnum
CREATE TYPE publication."ArticleStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'EDITORIAL_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE publication.articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    slug TEXT NOT NULL,
    abstract VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    domain core."ContributorDomain" NOT NULL,
    status publication."ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    version INTEGER NOT NULL DEFAULT 1,
    editor_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    CONSTRAINT articles_author_fk FOREIGN KEY (author_id) REFERENCES core.contributors(id),
    CONSTRAINT articles_editor_fk FOREIGN KEY (editor_id) REFERENCES core.contributors(id)
);

-- CreateTable
CREATE TABLE publication.article_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL,
    CONSTRAINT article_versions_article_fk FOREIGN KEY (article_id) REFERENCES publication.articles(id),
    CONSTRAINT article_versions_creator_fk FOREIGN KEY (created_by_id) REFERENCES core.contributors(id)
);

-- CreateIndex
CREATE UNIQUE INDEX idx_articles_slug ON publication.articles(slug);
CREATE INDEX idx_articles_author_id_status ON publication.articles(author_id, status);
CREATE INDEX idx_articles_domain_status ON publication.articles(domain, status);
CREATE INDEX idx_article_versions_article_version ON publication.article_versions(article_id, version_number);
