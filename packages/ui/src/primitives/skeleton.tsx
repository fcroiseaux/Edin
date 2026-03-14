import { cn } from '../lib/cn';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-surface-subtle motion-reduce:animate-none',
        className,
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
