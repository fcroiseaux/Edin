import type { Metadata } from 'next';
import { SignInButtons } from './sign-in-buttons';

export const metadata: Metadata = {
  title: 'Sign in — Edin',
  description: 'Sign in to Edin with GitHub or Google.',
};

type ErrorKey = 'account_link_conflict' | 'email_verification_required' | 'oauth_denied';

const ERROR_MESSAGES: Record<ErrorKey, string> = {
  account_link_conflict:
    'That email is already linked to a different Google account. Sign in with the provider you used originally.',
  email_verification_required:
    'We could not link your Google sign-in because the email is not verified by Google. Please verify it and try again, or sign in with the provider you used originally.',
  oauth_denied: 'Sign-in was cancelled before it finished. If this was a mistake, try again.',
};

interface SignInPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const errorKey = params.error as ErrorKey | undefined;
  const errorMessage = errorKey && errorKey in ERROR_MESSAGES ? ERROR_MESSAGES[errorKey] : null;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-96px)] max-w-[520px] flex-col items-center justify-center px-6 py-12">
      <div className="w-full rounded-lg border border-surface-subtle bg-surface-raised p-8 shadow-sm">
        <h1 className="font-serif text-[28px] font-bold text-text-primary">Sign in to Edin</h1>
        <p className="mt-3 font-sans text-[14px] leading-relaxed text-text-secondary">
          Choose a provider to continue. New to Edin? Signing in creates your contributor account.
        </p>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-6 rounded-md border border-accent-danger/40 bg-accent-danger/5 px-4 py-3 font-sans text-[13px] leading-relaxed text-accent-danger"
          >
            {errorMessage}
          </div>
        ) : null}

        <SignInButtons className="mt-8" />

        <p className="mt-8 font-sans text-[12px] leading-relaxed text-text-tertiary">
          By signing in you agree to Edin&apos;s community guidelines and our processing of your
          profile data for account creation and attribution.
        </p>
      </div>
    </main>
  );
}
