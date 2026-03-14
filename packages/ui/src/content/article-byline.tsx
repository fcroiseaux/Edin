import { forwardRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Avatar, AvatarImage, AvatarFallback } from '../radix/avatar';

export interface BylineProfile {
  name: string;
  role: string;
  avatarUrl?: string;
  avatarFallback?: string;
  profileHref?: string;
}

export interface ArticleBylineProps {
  author: BylineProfile;
  editor?: BylineProfile;
  additionalAuthors?: BylineProfile[];
  renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ProfileDisplay({
  profile,
  renderLink,
}: {
  profile: BylineProfile;
  renderLink?: ArticleBylineProps['renderLink'];
}) {
  const nameElement =
    profile.profileHref && renderLink ? (
      renderLink({
        href: profile.profileHref,
        className:
          'text-body-sm font-medium text-text-primary hover:text-accent-primary transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary rounded-sm',
        children: profile.name,
      })
    ) : profile.profileHref ? (
      <a
        href={profile.profileHref}
        className="text-body-sm font-medium text-text-primary hover:text-accent-primary transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary rounded-sm"
      >
        {profile.name}
      </a>
    ) : (
      <span className="text-body-sm font-medium text-text-primary">{profile.name}</span>
    );

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.name} />}
        <AvatarFallback className="text-xs">
          {profile.avatarFallback ?? getInitials(profile.name)}
        </AvatarFallback>
      </Avatar>
      <div>
        {nameElement}
        <p className="text-caption text-text-secondary">{profile.role}</p>
      </div>
    </div>
  );
}

export const ArticleByline = forwardRef<HTMLDivElement, ArticleBylineProps>(
  ({ author, editor, additionalAuthors, renderLink, className }, ref) => (
    <div ref={ref} className={cn('flex flex-wrap items-center gap-4', className)}>
      <ProfileDisplay profile={author} renderLink={renderLink} />
      {additionalAuthors?.map((a) => (
        <ProfileDisplay key={a.name} profile={a} renderLink={renderLink} />
      ))}
      {editor && (
        <>
          <div className="h-6 w-px bg-surface-subtle" aria-hidden="true" />
          <ProfileDisplay profile={editor} renderLink={renderLink} />
        </>
      )}
    </div>
  ),
);

ArticleByline.displayName = 'ArticleByline';
