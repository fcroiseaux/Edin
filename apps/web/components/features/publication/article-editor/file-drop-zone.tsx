'use client';

import { useState, useCallback, useRef, type DragEvent } from 'react';
import { useToast } from '../../../ui/toast';

interface FileDropZoneProps {
  onFileDrop: (file: File) => void;
  disabled?: boolean;
  children: React.ReactNode;
  accept: string[];
  maxSizeMB: number;
}

export function FileDropZone({
  onFileDrop,
  disabled,
  children,
  accept,
  maxSizeMB,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      // Only respond to file drags
      if (!e.dataTransfer.types.includes('Files')) return;

      dragCounterRef.current += 1;
      setIsDragging(true);
    },
    [disabled],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!accept.includes(ext)) {
        toast({
          title: `Unsupported file type: ${ext}. Allowed: ${accept.join(', ')}`,
          variant: 'error',
        });
        return;
      }

      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        toast({
          title: `File too large. Maximum size: ${maxSizeMB}MB`,
          variant: 'error',
        });
        return;
      }

      onFileDrop(file);
    },
    [disabled, accept, maxSizeMB, onFileDrop, toast],
  );

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-brand-accent bg-brand-accent/5">
          <span className="rounded-[var(--radius-md)] bg-surface-raised px-[var(--spacing-lg)] py-[var(--spacing-md)] font-sans text-[15px] font-medium text-brand-accent shadow-[var(--shadow-sm)]">
            Drop file here to import
          </span>
        </div>
      )}
    </div>
  );
}
