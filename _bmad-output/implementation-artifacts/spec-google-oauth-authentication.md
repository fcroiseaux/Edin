---
title: 'Google OAuth Authentication (alongside GitHub)'
type: 'feature'
created: '2026-04-23'
status: 'in-review'
baseline_commit: '16c3e9da47c2db91af000209b89504e6efda2886'
context:
  - '_bmad-output/implementation-artifacts/1-3-github-oauth-authentication.md'
  - '_bmad-output/planning-artifacts/architecture.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Authentication only supports GitHub OAuth. Contributors without a GitHub account (or who prefer not to use it) cannot sign in. Requires a second OAuth provider while preserving the existing GitHub flow, JWT/refresh-token model, RBAC, and audit trail.

**Approach:** Add a parallel `google` Passport strategy and `/auth/google` + `/auth/google/callback` endpoints that reuse the existing token issuance, Redis refresh-token storage, audit logging, and frontend session model. Make `Contributor.githubId` nullable, add a unique nullable `Contributor.googleId`, and enforce a DB CHECK constraint that at least one provider ID is present. Auto-link a Google sign-in to an existing contributor only when (i) `googleId` is not yet set, (ii) the Google email matches an existing contributor's email exactly, and (iii) Google reports `email_verified: true`. Replace the single nav button with a generic "Sign in" link to a new `/sign-in` page that lists both providers.

## Boundaries & Constraints

**Always:**

- Reuse the existing `AuthService.generateTokens`, `refreshTokens`, `logout`, Redis key pattern (`refresh_token:{contributorId}:{tokenId}`), and `edin_refresh_token` cookie. Do not introduce a parallel token model.
- Reuse `AuditService` for account creation and account-linking events. Use `source: 'google_oauth'` and `source: 'google_oauth_link'` respectively.
- Validate all Google OAuth env via Zod (`google.config.ts`) using the same pattern as `github.config.ts`.
- Use `ConfigService.getOrThrow` for required env at module bootstrap; never silently fall back to defaults for OAuth credentials.
- Never log access/refresh tokens, OAuth `code`, OAuth provider `accessToken`/`refreshToken`, or PII (email, name). Log `contributorId` and `correlationId` only.
- Maintain the API envelope (`{ data, meta }`) and use `DomainException` with existing error codes for failures (`AUTHENTICATION_FAILED`, `TOKEN_INVALID`, etc.). Add one new code `ACCOUNT_LINK_CONFLICT` to `@edin/shared` for the "Google email matches an account that already has a different googleId" case.
- New users created via Google start with role `APPLICANT`, mirroring the GitHub flow.
- Migration must preserve all existing rows: drop NOT NULL on `github_id`, add nullable `google_id` with unique index, add CHECK constraint `(github_id IS NOT NULL OR google_id IS NOT NULL)`. All existing rows already have `github_id`, so the CHECK is satisfied.

**Ask First:**

- Any change to JWT payload shape (`{ sub, role }` today). Adding `provider` would break existing tokens in flight.
- Any change to refresh-token Redis key pattern.
- Adding additional OAuth scopes beyond `profile` and `email`.
- Removing the GitHub flow or the "Login with GitHub" path.

**Never:**

- No NextAuth / Auth.js / Lucia / Better-Auth — keep the Passport-on-Nest architecture from Story 1.3.
- No email/password fallback in this scope (deferred per Story 1.3 scope notes).
- No "merge two existing contributors" UI flow. Linking is one-directional and only adds a `googleId` to a record that doesn't already have one.
- No changes to RBAC / CASL ability factory (Story 1.4 boundary).
- No silent linking when `email_verified` is `false` or absent — fall through to "create new contributor" with the Google email instead.
- No storing of the Google `accessToken` / `refreshToken` issued by Google. We only consume the profile during the callback and discard them.

## I/O & Edge-Case Matrix

| Scenario                                                                                                     | Input / State                                                                                                                                                | Expected Output / Behavior                                                                                                                                                                                     | Error Handling                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New Google user, no email collision                                                                          | Google profile with `googleId=G1`, `email=alice@x.com`, `email_verified=true`; no contributor with `googleId=G1` and no contributor with `email=alice@x.com` | Create new contributor `{ googleId: G1, email, name, avatarUrl, role: APPLICANT }`. Audit log `CREATED` with `details.source='google_oauth'`. Issue tokens, set cookie, redirect to `/api/auth/callback`.      | N/A                                                                                                                                                                                                                  |
| Returning Google user                                                                                        | Contributor exists with `googleId=G1`                                                                                                                        | Update name/email/avatar, issue tokens, redirect. No audit log.                                                                                                                                                | N/A                                                                                                                                                                                                                  |
| Google user, email matches existing GitHub-only contributor, `email_verified=true`, target has no `googleId` | Contributor `{ githubId: 42, email: alice@x.com, googleId: null }` exists; Google profile `{ googleId: G1, email: alice@x.com, email_verified: true }`       | Set `googleId=G1` on the existing contributor (also refresh name/avatar from Google). Audit log `UPDATED` with `details.source='google_oauth_link', linkedFromGithubId=42`. Issue tokens for that contributor. | N/A                                                                                                                                                                                                                  |
| Google user, email matches existing contributor that already has a different `googleId`                      | Contributor `{ email: alice@x.com, googleId: G_OTHER }` exists; Google profile `{ googleId: G1, email: alice@x.com }`                                        | Refuse. Throw `DomainException(ACCOUNT_LINK_CONFLICT, 'Email already linked to a different Google account', 409)`. Redirect to `/sign-in?error=account_link_conflict`. Log at `warn` level (no PII).           | Wrapped by `GlobalExceptionFilter` → standard error envelope on the JSON path; controller catches for the redirect path.                                                                                             |
| Google user, `email_verified=false` (or missing)                                                             | Google profile with unverified email                                                                                                                         | Do NOT auto-link even if email matches. Create new contributor with the Google email (uniqueness check on `email` may fail — see next row).                                                                    | If unique-email collision blocks creation, throw `DomainException(ACCOUNT_LINK_CONFLICT, 'Verified email required to link to existing account', 409)` with redirect to `/sign-in?error=email_verification_required`. |
| Google profile missing email entirely                                                                        | Google profile with no email and `googleId=G1`                                                                                                               | Create contributor with `email=null`, `googleId=G1`. Tokens issued normally.                                                                                                                                   | N/A                                                                                                                                                                                                                  |
| Google OAuth `code` invalid / user denies consent                                                            | Google redirects with `error=access_denied` to `/auth/google/callback`                                                                                       | Redirect to `/sign-in?error=oauth_denied`. Log `warn`.                                                                                                                                                         | Passport will throw — controller catches and redirects rather than returning JSON.                                                                                                                                   |
| Token refresh, logout, `/auth/me` for Google-authenticated user                                              | Existing access/refresh token pair issued via Google flow                                                                                                    | Same behavior as GitHub-authenticated user — provider is invisible to the rest of the system.                                                                                                                  | Same as today.                                                                                                                                                                                                       |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma` -- `Contributor` model: `githubId` becomes nullable; add `googleId String? @unique @map("google_id")`. Existing `email String? @unique` stays as-is.
- `apps/api/prisma/migrations/<timestamp>_add_google_oauth/migration.sql` -- new migration: drop NOT NULL on `github_id`, add `google_id` column + unique index, add CHECK constraint on at-least-one provider.
- `apps/api/prisma/seed.ts` -- update if any seed expects `githubId` to be non-null on read paths (currently writes only — verify).
- `apps/api/src/config/google.config.ts` -- NEW: Zod-validated `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`. Mirror `github.config.ts`.
- `apps/api/src/modules/auth/strategies/google.strategy.ts` -- NEW: `PassportStrategy(Strategy, 'google')` from `passport-google-oauth20`, scopes `['profile', 'email']`. `validate()` returns `GoogleProfile { googleId, displayName, email, emailVerified, avatarUrl }`.
- `apps/api/src/modules/auth/strategies/google.strategy.spec.ts` -- NEW: profile-mapping tests including `email_verified` propagation and missing-email handling.
- `apps/api/src/modules/auth/auth.service.ts` -- ADD `validateGoogleUser(profile, correlationId)` mirroring `validateGithubUser` plus the linking rules above. Pure `Contributor` lookup by `googleId`, then email-match fallback.
- `apps/api/src/modules/auth/auth.service.spec.ts` -- ADD test cases per I/O Matrix (new user, returning, link, conflict, unverified, missing-email).
- `apps/api/src/modules/auth/auth.controller.ts` -- ADD `@Get('google')` and `@Get('google/callback')` mirroring the GitHub endpoints; controller catches `DomainException(ACCOUNT_LINK_CONFLICT)` and OAuth denial to redirect to `/sign-in?error=...` instead of returning JSON.
- `apps/api/src/modules/auth/auth.controller.spec.ts` -- ADD endpoint tests with mocked `AuthService` covering success and conflict redirect paths.
- `apps/api/src/modules/auth/auth.module.ts` -- register `GoogleStrategy` in providers.
- `apps/api/.env.example` -- add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback`.
- `apps/api/package.json` -- add `passport-google-oauth20@^2.0.0` and devDep `@types/passport-google-oauth20`.
- `packages/shared/src/constants/error-codes.ts` -- add `ACCOUNT_LINK_CONFLICT`.
- `packages/shared/src/index.ts` -- re-export of error code (auto if barrel re-exports the constants module).
- `apps/web/app/(public)/sign-in/page.tsx` -- NEW: dedicated sign-in page listing both providers; reads `?error=` query and renders a clear, non-blaming error message.
- `apps/web/components/features/navigation/public-nav.tsx` -- replace `<button onClick={login}>Login with GitHub</button>` with a `<Link href="/sign-in">Sign in</Link>`.
- `apps/web/hooks/use-auth.ts` -- replace the single `login()` function (which redirects to `/api/v1/auth/github`) with `loginWithGithub()` and `loginWithGoogle()`. Update `User` interface: `githubId: number | null` and add `googleId: string | null`. Update `apiClient` `/auth/me` consumer if needed.
- `apps/api/src/modules/auth/auth.controller.ts` (`getMe`) -- update return shape to include `googleId` (nullable) alongside `githubId` (now nullable).
- `apps/web/app/(public)/docs/getting-started/page.tsx` -- mention Google as a sign-in option (small copy update; the existing "Sign in with GitHub" line becomes "Sign in with GitHub or Google").

## Tasks & Acceptance

**Execution:**

- [x] `apps/api/package.json` -- add `passport-google-oauth20` (^2.0.0) and `@types/passport-google-oauth20` (devDep). Run `pnpm install` to update lockfile.
- [x] `apps/api/src/config/google.config.ts` -- create Zod-validated config mirroring `github.config.ts`.
- [x] `apps/api/.env.example` -- append `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` with the localhost callback default.
- [x] `apps/api/prisma/schema.prisma` -- on `Contributor`: change `githubId Int @unique @map("github_id")` to `githubId Int? @unique @map("github_id")`; add `googleId String? @unique @map("google_id")`.
- [x] `apps/api/prisma/migrations/<timestamp>_add_google_oauth/migration.sql` -- generate via `pnpm --filter api exec prisma migrate dev --create-only --name add_google_oauth`. Hand-edit to add the CHECK constraint: `ALTER TABLE "core"."contributors" ADD CONSTRAINT "contributors_provider_required" CHECK ("github_id" IS NOT NULL OR "google_id" IS NOT NULL);`. Verify the diff drops `NOT NULL` on `github_id` and creates a unique index on `google_id`.
- [x] `apps/api/src/modules/auth/strategies/google.strategy.ts` -- create Passport strategy. `validate()` returns `{ googleId, displayName, email, emailVerified, avatarUrl }`. Pull `email_verified` from `profile._json.email_verified` (passport-google-oauth20 surfaces it under `_json`).
- [x] `apps/api/src/modules/auth/strategies/google.strategy.spec.ts` -- profile mapping tests: with email, without email, `email_verified=true|false|undefined`, multiple emails (use primary).
- [x] `apps/api/src/modules/auth/auth.service.ts` -- add `validateGoogleUser(profile, correlationId)`. Algorithm: lookup by `googleId` → if found, update profile fields and return. Else if `profile.email && profile.emailVerified`, lookup by `email`: if found and `googleId == null`, set `googleId` and audit `source='google_oauth_link'`; if found and `googleId != null && googleId !== profile.googleId`, throw `DomainException(ACCOUNT_LINK_CONFLICT, ..., 409)`. Else create new contributor with `APPLICANT` role and audit `source='google_oauth'`.
- [x] `apps/api/src/modules/auth/auth.service.spec.ts` -- add unit tests covering all I/O Matrix rows. Mock `PrismaService` and `AuditService`.
- [x] `apps/api/src/modules/auth/auth.controller.ts` -- add `@Get('google')` (Passport redirect) and `@Get('google/callback')`. Wrap `validateGoogleUser` in try/catch: on `ACCOUNT_LINK_CONFLICT` → `res.redirect(\`${frontendUrl}/sign-in?error=account_link_conflict\`)`; on Passport `access_denied`(handled by Passport throwing before reaching our code) — add a small`googleAuthErrorHandler`middleware or guard override that redirects to`/sign-in?error=oauth_denied`. Update `getMe()`payload to include`googleId`and to allow`githubId: number | null`.
- [x] `apps/api/src/modules/auth/auth.controller.spec.ts` -- add tests: `/auth/google` triggers Passport redirect; `/auth/google/callback` happy path issues tokens + sets cookie; conflict path redirects with the right query string.
- [x] `apps/api/src/modules/auth/auth.module.ts` -- add `GoogleStrategy` to `providers`.
- [x] `packages/shared/src/constants/error-codes.ts` -- add `ACCOUNT_LINK_CONFLICT: 'ACCOUNT_LINK_CONFLICT'`. Confirm it is re-exported via the package barrel.
- [x] `apps/api/prisma/seed.ts` -- audit reads to confirm none assume `githubId` is non-null for contributors created by the seed; no functional change expected (seed creates GitHub contributors only).
- [x] `apps/web/app/(public)/sign-in/page.tsx` -- create page with two buttons (Google + GitHub) that navigate to `${NEXT_PUBLIC_API_URL}/api/v1/auth/google` and `/api/v1/auth/github` respectively. Read `?error=` query param and render a clear inline error (`account_link_conflict`, `email_verification_required`, `oauth_denied`). Match existing design tokens (use `bg-accent-primary`, etc.).
- [x] `apps/web/components/features/navigation/public-nav.tsx` -- replace the inline login button with a `Link` to `/sign-in` labelled "Sign in".
- [x] `apps/web/hooks/use-auth.ts` -- update the `User` interface (`githubId: number | null`, add `googleId: string | null`). Replace `login()` with `loginWithGithub()` and `loginWithGoogle()` helpers. Existing callers in nav are removed (button now navigates via `Link`). Update any consumer that calls `login()` — search the repo and update.
- [x] `apps/web/app/(public)/docs/getting-started/page.tsx` -- update copy: "Sign in with GitHub" → "Sign in with GitHub or Google".

**Acceptance Criteria:**

- Given an unauthenticated visitor on the public landing, when they click "Sign in" in the nav, then they land on `/sign-in` and see two visually distinct buttons for Google and GitHub.
- Given a Google profile not yet known to EDIN with a verified email that does not match any existing contributor, when the user completes Google OAuth, then a new `Contributor` row is created with `googleId` set, `githubId` null, role `APPLICANT`, an `audit_logs` entry recorded with `details.source = 'google_oauth'`, and the user is redirected to `/api/auth/callback` with the `edin_refresh_token` cookie set.
- Given a Google profile whose verified email matches an existing GitHub-only contributor (i.e. `googleId IS NULL`), when the user completes Google OAuth for the first time, then the existing contributor row is updated with the new `googleId`, an `audit_logs` entry is recorded with `details.source = 'google_oauth_link'`, and the user is redirected logged in as that existing contributor (same `id`, same role).
- Given a Google profile whose email matches an existing contributor that already has a different `googleId`, when the user completes Google OAuth, then no DB write occurs and the user is redirected to `/sign-in?error=account_link_conflict` with a human-readable message and a `warn`-level log entry that contains `correlationId` but no PII.
- Given a Google profile with `email_verified = false` whose email matches an existing contributor, when the user completes Google OAuth, then no linking occurs and the user is redirected to `/sign-in?error=email_verification_required` (creation also fails because of the unique-email constraint, surfaced via the same error code).
- Given an authenticated user (regardless of provider), when they hit `GET /api/v1/auth/me`, then the response includes both `githubId: number | null` and `googleId: string | null`, plus the existing fields.
- Given a logout from a Google-authenticated session, when the user clicks logout, then the refresh token is invalidated in Redis and the cookie is cleared — identical behavior to the GitHub flow (no provider-specific code path).
- Given the migration is applied to a database containing existing GitHub-only contributors, when `prisma migrate deploy` runs, then no rows are lost, all existing rows still satisfy the new CHECK constraint, and `prisma migrate status` reports no drift.

## Spec Change Log

<!-- Append-only — populated only by step-04 review loops. Empty at draft time. -->

## Design Notes

**Why not introduce a generic `OAuthAccount` join table?** A separate `oauth_accounts (provider, providerId, contributorId)` table is the canonical "right" design for N providers and would avoid the CHECK constraint. But for two providers in an MVP, two nullable columns + a CHECK is meaningfully simpler: one query fewer per login, no relation to maintain, no cascade decisions. If a third provider is added later, that's the moment to refactor to a join table — not now.

**Why `passport-google-oauth20` and not `openid-client` or `arctic`?** Story 1.3 standardised on Passport, the existing JWT/Redis flow is bound to a Passport strategy class, and `passport-google-oauth20` is the direct counterpart to `passport-github2`. Mixing OAuth client libraries would create two parallel auth call paths to maintain.

**Why redirect on `ACCOUNT_LINK_CONFLICT` instead of returning JSON?** The Google callback is a top-level browser navigation, not an XHR. Returning a JSON envelope to a browser GET would just render raw JSON. The `/sign-in?error=...` redirect lets the existing React surface render the message in context, with retry affordances.

**Linking algorithm — golden example:**

```ts
// apps/api/src/modules/auth/auth.service.ts (sketch)
async validateGoogleUser(profile: GoogleProfile, correlationId?: string) {
  const byGoogleId = await this.prisma.contributor.findUnique({ where: { googleId: profile.googleId } });
  if (byGoogleId) return this.refreshAndReturn(byGoogleId, profile);

  if (profile.email && profile.emailVerified) {
    const byEmail = await this.prisma.contributor.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      if (byEmail.googleId && byEmail.googleId !== profile.googleId) {
        throw new DomainException(ERROR_CODES.ACCOUNT_LINK_CONFLICT, 'Email already linked to a different Google account', 409);
      }
      const linked = await this.prisma.contributor.update({
        where: { id: byEmail.id },
        data: { googleId: profile.googleId, name: profile.displayName, avatarUrl: profile.avatarUrl },
      });
      await this.auditService.log({ actorId: linked.id, action: 'UPDATED', entityType: 'contributor', entityId: linked.id, details: { source: 'google_oauth_link' }, correlationId });
      return { contributor: this.toAuthContributor(linked), isNewUser: false };
    }
  }

  // Create new
  const created = await this.prisma.contributor.create({
    data: { googleId: profile.googleId, email: profile.email, name: profile.displayName, avatarUrl: profile.avatarUrl, role: 'APPLICANT' },
  });
  await this.auditService.log({ actorId: null, action: 'CREATED', entityType: 'contributor', entityId: created.id, details: { source: 'google_oauth', googleId: profile.googleId }, correlationId });
  return { contributor: this.toAuthContributor(created), isNewUser: true };
}
```

**Migration SQL sketch:**

```sql
ALTER TABLE "core"."contributors" ALTER COLUMN "github_id" DROP NOT NULL;
ALTER TABLE "core"."contributors" ADD COLUMN "google_id" TEXT;
CREATE UNIQUE INDEX "contributors_google_id_key" ON "core"."contributors"("google_id");
ALTER TABLE "core"."contributors"
  ADD CONSTRAINT "contributors_provider_required"
  CHECK ("github_id" IS NOT NULL OR "google_id" IS NOT NULL);
```

## Verification

**Commands:**

- `pnpm --filter api exec prisma format` -- expected: schema validates, no warnings.
- `pnpm --filter api exec prisma migrate dev --name add_google_oauth` -- expected: migration applied locally, no data loss.
- `pnpm --filter api build` -- expected: TS compiles.
- `pnpm --filter api test` -- expected: all auth tests pass (existing 33 + ~10 new).
- `pnpm --filter web build` -- expected: Next.js build passes.
- `pnpm --filter web test` -- expected: existing tests pass.
- `pnpm lint` -- expected: clean.

**Manual checks:**

- Register an OAuth client at `https://console.cloud.google.com/apis/credentials` (Web application, authorized redirect `http://localhost:3001/api/v1/auth/google/callback`). Add credentials to `apps/api/.env`.
- Walk through `/sign-in` → Google → callback → dashboard with a brand-new Google account.
- Walk through `/sign-in` → Google with a Google account whose email matches an existing GitHub-authenticated contributor; verify `googleId` is populated and the user logs in as the existing contributor (same `id`, same role, same dashboard).
- Inspect `audit_logs` to confirm `details.source` values for create vs. link.
- Trigger the conflict path manually by directly inserting a `googleId` on a contributor in the DB, then signing in with a different Google account that shares the same email. Verify the redirect to `/sign-in?error=account_link_conflict`.
