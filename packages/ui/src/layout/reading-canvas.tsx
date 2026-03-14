import { forwardRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface ReadingCanvasProps {
  topBar?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const ReadingCanvas = forwardRef<HTMLDivElement, ReadingCanvasProps>(
  ({ topBar, children, className }, ref) => (
    <div ref={ref} className={cn('min-h-screen bg-surface-reading', className)}>
      {topBar && (
        <header className="border-b border-surface-subtle">
          <div className="mx-auto flex max-w-[680px] items-center justify-between px-6 py-3">
            {topBar}
          </div>
        </header>
      )}
      <article className="mx-auto max-w-[680px] px-6 py-12 text-body-lg text-text-primary [&>*+*]:mt-6 [&_h1]:text-h1 [&_h1]:text-text-heading [&_h1]:font-[800] [&_h1]:mb-4 [&_h2]:text-h2 [&_h2]:text-text-heading [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-h3 [&_h3]:text-text-heading [&_h3]:font-bold [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:leading-[1.7] [&_p+p]:mt-[1.5em]">
        {children}
      </article>
    </div>
  ),
);

ReadingCanvas.displayName = 'ReadingCanvas';
