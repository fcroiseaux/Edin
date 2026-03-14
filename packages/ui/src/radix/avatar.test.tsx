import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

describe('Avatar', () => {
  it('renders with rounded-full', () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('rounded-full');
  });

  it('renders fallback text', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText('AB')).toBeDefined();
  });

  it('applies surface-subtle background on fallback', () => {
    render(
      <Avatar>
        <AvatarFallback data-testid="fallback">XY</AvatarFallback>
      </Avatar>,
    );
    const fallback = screen.getByTestId('fallback');
    expect(fallback.className).toContain('bg-surface-subtle');
  });

  it('applies text-text-secondary on fallback', () => {
    render(
      <Avatar>
        <AvatarFallback data-testid="fallback">XY</AvatarFallback>
      </Avatar>,
    );
    const fallback = screen.getByTestId('fallback');
    expect(fallback.className).toContain('text-text-secondary');
  });

  it('renders AvatarImage component without error', () => {
    // In jsdom, Radix Avatar shows fallback because images don't load
    // We verify AvatarImage renders without crashing and fallback displays
    render(
      <Avatar>
        <AvatarImage src="/photo.jpg" alt="User" />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>,
    );
    // Fallback renders since image can't load in jsdom
    expect(screen.getByText('U')).toBeDefined();
  });

  it('merges custom className on Avatar', () => {
    render(
      <Avatar data-testid="avatar" className="h-16 w-16">
        <AvatarFallback>C</AvatarFallback>
      </Avatar>,
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('h-16');
    expect(avatar.className).toContain('w-16');
  });

  it('merges custom className on AvatarFallback', () => {
    render(
      <Avatar>
        <AvatarFallback data-testid="fallback" className="text-lg">
          C
        </AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByTestId('fallback').className).toContain('text-lg');
  });
});
