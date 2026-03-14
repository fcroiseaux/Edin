import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';

function renderAccordion() {
  return render(
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1" data-testid="item-1">
        <AccordionTrigger>Section One</AccordionTrigger>
        <AccordionContent>Content One</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Section Two</AccordionTrigger>
        <AccordionContent>Content Two</AccordionContent>
      </AccordionItem>
    </Accordion>,
  );
}

describe('Accordion', () => {
  it('renders triggers', () => {
    renderAccordion();
    expect(screen.getByText('Section One')).toBeDefined();
    expect(screen.getByText('Section Two')).toBeDefined();
  });

  it('applies blush-pink text to trigger', () => {
    renderAccordion();
    const trigger = screen.getByText('Section One').closest('button');
    expect(trigger?.className).toContain('text-text-heading');
  });

  it('applies border to accordion item', () => {
    renderAccordion();
    const item = screen.getByTestId('item-1');
    expect(item.className).toContain('border-surface-subtle');
  });

  it('toggles content on click', async () => {
    const user = userEvent.setup();
    renderAccordion();
    const trigger = screen.getByText('Section One');
    await user.click(trigger);
    expect(screen.getByText('Content One')).toBeDefined();
  });

  it('has focus-visible ring on trigger', () => {
    renderAccordion();
    const trigger = screen.getByText('Section One').closest('button');
    expect(trigger?.className).toContain('focus-visible:ring-accent-primary');
  });

  it('renders chevron icon with aria-hidden', () => {
    renderAccordion();
    const trigger = screen.getByText('Section One').closest('button');
    const svg = trigger?.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('merges custom className on AccordionItem', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1" data-testid="custom" className="custom-item">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const item = screen.getByTestId('custom');
    expect(item.className).toContain('custom-item');
  });

  it('merges custom className on AccordionContent', async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent className="custom-content">Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    await user.click(screen.getByText('Trigger'));
    const content = screen.getByText('Body').closest('[data-state]');
    expect(content?.className).toContain('custom-content');
  });
});
