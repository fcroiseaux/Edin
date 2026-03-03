'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';

type ToastVariant = 'success' | 'error';

interface ToastState {
  open: boolean;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({
    open: false,
    title: '',
    variant: 'success',
  });

  const toast = useCallback(
    (opts: { title: string; description?: string; variant?: ToastVariant }) => {
      setState({
        open: true,
        title: opts.title,
        description: opts.description,
        variant: opts.variant ?? 'success',
      });
    },
    [],
  );

  const variantStyles =
    state.variant === 'error'
      ? 'border-semantic-error bg-[#fdf2f2]'
      : 'border-semantic-success bg-[#f2fdf5]';

  return (
    <ToastContext value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        <ToastPrimitive.Root
          open={state.open}
          onOpenChange={(open) => setState((s) => ({ ...s, open }))}
          duration={4000}
          className={`rounded-[var(--radius-md)] border px-[var(--spacing-md)] py-[var(--spacing-sm)] shadow-[var(--shadow-card)] ${variantStyles}`}
        >
          <ToastPrimitive.Title className="font-sans text-[14px] font-medium text-brand-primary">
            {state.title}
          </ToastPrimitive.Title>
          {state.description && (
            <ToastPrimitive.Description className="mt-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary">
              {state.description}
            </ToastPrimitive.Description>
          )}
        </ToastPrimitive.Root>
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-50 m-[var(--spacing-lg)] flex w-[360px] max-w-[100vw] flex-col gap-[var(--spacing-sm)]" />
      </ToastPrimitive.Provider>
    </ToastContext>
  );
}
