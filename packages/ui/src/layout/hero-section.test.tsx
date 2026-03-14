import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroSection } from './hero-section';

describe('HeroSection', () => {
  it('renders headline', () => {
    render(<HeroSection headline="Welcome to Edin" />);
    expect(screen.getByText('Welcome to Edin')).toBeDefined();
  });

  it('renders as section with aria-label', () => {
    render(<HeroSection headline="Title" />);
    const section = screen.getByLabelText('Hero');
    expect(section.tagName).toBe('SECTION');
  });

  it('applies surface-base background', () => {
    render(<HeroSection headline="Title" />);
    const section = screen.getByLabelText('Hero');
    expect(section.className).toContain('bg-surface-base');
  });

  it('renders full variant with min-height 80vh by default', () => {
    render(<HeroSection headline="Title" />);
    const section = screen.getByLabelText('Hero');
    expect(section.className).toContain('min-h-[80vh]');
  });

  it('renders compact variant without min-height', () => {
    render(<HeroSection headline="Title" variant="compact" />);
    const section = screen.getByLabelText('Hero');
    expect(section.className).not.toContain('min-h-[80vh]');
    expect(section.className).toContain('py-20');
  });

  it('renders overline with accent-primary text', () => {
    render(<HeroSection headline="Title" overline="Contributor Platform" />);
    const overline = screen.getByText('Contributor Platform');
    expect(overline.className).toContain('text-accent-primary');
    expect(overline.className).toContain('uppercase');
  });

  it('renders subtitle', () => {
    render(<HeroSection headline="Title" subtitle="A description" />);
    expect(screen.getByText('A description')).toBeDefined();
  });

  it('renders CTA slot', () => {
    render(<HeroSection headline="Title" cta={<button>Apply</button>} />);
    expect(screen.getByText('Apply')).toBeDefined();
  });

  it('does not render overline when not provided', () => {
    const { container } = render(<HeroSection headline="Title" />);
    // Only the headline text should be present, no overline paragraph
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  it('has gradient overlay as decorative (aria-hidden)', () => {
    render(<HeroSection headline="Title" />);
    const section = screen.getByLabelText('Hero');
    const gradient = section.querySelector('[aria-hidden="true"]');
    expect(gradient).not.toBeNull();
  });

  it('applies display text and font-black to headline', () => {
    render(<HeroSection headline="Big Title" />);
    const headline = screen.getByText('Big Title');
    expect(headline.className).toContain('text-display');
    expect(headline.className).toContain('font-black');
  });

  it('merges custom className', () => {
    render(<HeroSection headline="Title" className="custom-hero" />);
    const section = screen.getByLabelText('Hero');
    expect(section.className).toContain('custom-hero');
  });
});
