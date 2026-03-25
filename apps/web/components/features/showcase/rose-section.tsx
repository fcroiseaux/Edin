'use client';

import Image from 'next/image';
import Link from 'next/link';
import * as Accordion from '@radix-ui/react-accordion';
import { ROSE_INTRO, ROSE_CONCEPTS } from '../rose/rose-data';

export function RoseSection() {
  return (
    <section className="bg-surface-sunken px-6 py-20" aria-label="About ROSE">
      <div className="mx-auto max-w-[1200px]">
        <Image
          src="/rose-logo.svg"
          alt="ROSE logo"
          width={200}
          height={200}
          className="mx-auto mb-8 opacity-80"
        />
        <p className="text-center font-mono text-[13px] font-medium uppercase tracking-[0.15em] text-accent-primary">
          The ROSE Project
        </p>
        <h2 className="mt-2 text-center font-serif text-[clamp(1.5rem,3vw,2rem)] leading-[1.25] font-bold text-text-primary">
          Reinventing Financial Architecture
        </h2>
        <p className="mx-auto mt-6 max-w-[720px] text-center font-sans text-[16px] leading-[1.7] text-text-secondary">
          ROSE is a common good initiative to build a decentralized financial infrastructure that
          reimagines how markets operate. Rooted in decades of research into high-frequency market
          microstructure, ROSE channels the vast value of market volatility into a Common Good
          Treasury that funds ecological and societal regeneration.
        </p>
        <p className="mx-auto mt-4 max-w-[680px] text-center font-sans text-[15px] leading-[1.6] text-text-secondary">
          {ROSE_INTRO}
        </p>

        <div className="mx-auto mt-[var(--spacing-xl)] max-w-[680px]">
          <p className="mb-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-text-primary">
            Key Concepts
          </p>
          <Accordion.Root type="single" collapsible>
            {ROSE_CONCEPTS.map((concept) => (
              <Accordion.Item
                key={concept.title}
                value={concept.title}
                className="border-b border-surface-subtle"
              >
                <Accordion.Trigger className="group flex w-full items-center justify-between py-[var(--spacing-md)] text-left font-sans text-[14px] font-semibold text-text-primary transition-colors duration-[var(--transition-fast)] hover:text-accent-primary">
                  {concept.title}
                  <svg
                    className="h-[16px] w-[16px] shrink-0 text-text-secondary transition-transform duration-200 group-data-[state=open]:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </Accordion.Trigger>
                <Accordion.Content className="accordion-content overflow-hidden">
                  <p className="pb-[var(--spacing-md)] font-sans text-[14px] leading-[1.65] text-text-secondary">
                    {concept.shortDescription}
                  </p>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>

        <div className="mt-[var(--spacing-lg)] text-center">
          <Link
            href="/rose"
            className="font-sans text-[14px] font-semibold text-accent-primary transition-colors duration-[var(--transition-fast)] hover:text-text-primary"
          >
            Learn more about ROSE &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
