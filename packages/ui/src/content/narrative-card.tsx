import { forwardRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import type { Domain } from '../primitives/badge';
import { PillarAccentLine } from '../domain/pillar-accent-line';
import { DomainBadge } from '../domain/domain-badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../radix/accordion';

export type NarrativeCardVariant = 'default' | 'evaluation' | 'feedback';

export interface NarrativeCardProps {
  domain: Domain;
  title: string;
  narrative: string;
  metadata?: ReactNode;
  variant?: NarrativeCardVariant;
  expandedContent?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  href?: string;
  renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
  'aria-label'?: string;
  className?: string;
}

export const NarrativeCard = forwardRef<HTMLDivElement, NarrativeCardProps>(
  (
    {
      domain,
      title,
      narrative,
      metadata,
      variant = 'default',
      expandedContent,
      actions,
      onClick,
      href,
      renderLink,
      'aria-label': ariaLabel,
      className,
    },
    ref,
  ) => {
    const cardContent = (
      <div className="flex gap-4 p-4">
        <PillarAccentLine domain={domain} />
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-2">
            <h3 className="text-body-sm font-medium text-text-primary">{title}</h3>
            <DomainBadge domain={domain} />
          </div>

          {/* Narrative */}
          <p className="mt-2 text-body-sm text-text-primary">{narrative}</p>

          {/* Evaluation variant: accordion */}
          {variant === 'evaluation' && expandedContent && (
            <Accordion type="single" collapsible className="mt-3">
              <AccordionItem value="details" className="border-none">
                <AccordionTrigger className="py-1 text-caption text-text-secondary">
                  See detail
                </AccordionTrigger>
                <AccordionContent>{expandedContent}</AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Feedback variant: action buttons */}
          {variant === 'feedback' && actions && (
            <div className="mt-3 flex items-center gap-2">{actions}</div>
          )}

          {/* Metadata row */}
          {metadata && <div className="mt-3 text-caption text-text-tertiary">{metadata}</div>}
        </div>
      </div>
    );

    const wrapperClassName = cn(
      'rounded-md border border-surface-subtle bg-surface-raised transition-all',
      'hover:border-accent-primary/30 hover:shadow-md',
      (onClick || href) && 'cursor-pointer',
      className,
    );

    if (href && renderLink) {
      return (
        <>
          {renderLink({
            href,
            className: wrapperClassName,
            children: cardContent,
          })}
        </>
      );
    }

    return (
      <div
        ref={ref}
        className={wrapperClassName}
        onClick={onClick}
        role={onClick || href ? 'button' : undefined}
        tabIndex={onClick || href ? 0 : undefined}
        aria-label={ariaLabel}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        {cardContent}
      </div>
    );
  },
);

NarrativeCard.displayName = 'NarrativeCard';
