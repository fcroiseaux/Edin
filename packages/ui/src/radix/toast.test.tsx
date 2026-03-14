import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';

function renderToast(variant?: 'default' | 'success' | 'error' | 'warning') {
  return render(
    <ToastProvider>
      <Toast open variant={variant}>
        <ToastTitle>Notification</ToastTitle>
        <ToastDescription>Something happened</ToastDescription>
        <ToastClose>X</ToastClose>
      </Toast>
      <ToastViewport data-testid="viewport" />
    </ToastProvider>,
  );
}

describe('Toast', () => {
  it('renders title and description', () => {
    renderToast();
    expect(screen.getByText('Notification')).toBeDefined();
    expect(screen.getByText('Something happened')).toBeDefined();
  });

  it('applies surface-raised background', () => {
    renderToast();
    const toast = screen.getByText('Notification').closest('[data-state]');
    expect(toast?.className).toContain('bg-surface-raised');
  });

  it('applies shadow-lg', () => {
    renderToast();
    const toast = screen.getByText('Notification').closest('[data-state]');
    expect(toast?.className).toContain('shadow-lg');
  });

  it('applies default accent-primary left border', () => {
    renderToast();
    const toast = screen.getByText('Notification').closest('[data-state]');
    expect(toast?.className).toContain('border-l-accent-primary');
  });

  it('applies success left border', () => {
    renderToast('success');
    const toast = screen.getByText('Notification').closest('[data-state]');
    expect(toast?.className).toContain('border-l-success');
  });

  it('applies error left border', () => {
    renderToast('error');
    const toast = screen.getByText('Notification').closest('[data-state]');
    expect(toast?.className).toContain('border-l-error');
  });

  it('applies warning left border', () => {
    renderToast('warning');
    const toast = screen.getByText('Notification').closest('[data-state]');
    expect(toast?.className).toContain('border-l-warning');
  });

  it('renders title with text-primary', () => {
    renderToast();
    const title = screen.getByText('Notification');
    expect(title.className).toContain('text-text-primary');
  });

  it('renders description with text-secondary', () => {
    renderToast();
    const desc = screen.getByText('Something happened');
    expect(desc.className).toContain('text-text-secondary');
  });

  it('viewport positioned bottom-right', () => {
    renderToast();
    const viewport = screen.getByTestId('viewport');
    expect(viewport.className).toContain('bottom-0');
    expect(viewport.className).toContain('right-0');
  });
});
