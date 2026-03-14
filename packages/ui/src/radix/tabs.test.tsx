import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

function renderTabs() {
  return render(
    <Tabs defaultValue="one">
      <TabsList>
        <TabsTrigger value="one">Tab One</TabsTrigger>
        <TabsTrigger value="two">Tab Two</TabsTrigger>
      </TabsList>
      <TabsContent value="one">Content One</TabsContent>
      <TabsContent value="two">Content Two</TabsContent>
    </Tabs>,
  );
}

describe('Tabs', () => {
  it('renders tab triggers', () => {
    renderTabs();
    expect(screen.getByText('Tab One')).toBeDefined();
    expect(screen.getByText('Tab Two')).toBeDefined();
  });

  it('shows default tab content', () => {
    renderTabs();
    expect(screen.getByText('Content One')).toBeDefined();
  });

  it('switches content on click', async () => {
    const user = userEvent.setup();
    renderTabs();
    await user.click(screen.getByText('Tab Two'));
    expect(screen.getByText('Content Two')).toBeDefined();
  });

  it('applies underline border style on TabsList', () => {
    renderTabs();
    const list = screen.getByRole('tablist');
    expect(list.className).toContain('border-b');
    expect(list.className).toContain('border-surface-subtle');
  });

  it('applies accent-primary underline on active tab', () => {
    renderTabs();
    const trigger = screen.getByText('Tab One');
    expect(trigger.className).toContain('data-[state=active]:border-accent-primary');
  });

  it('applies focus-visible ring on trigger', () => {
    renderTabs();
    const trigger = screen.getByText('Tab One');
    expect(trigger.className).toContain('focus-visible:ring-accent-primary');
  });

  it('supports domain pillar-color underline', () => {
    render(
      <Tabs defaultValue="tech">
        <TabsList>
          <TabsTrigger value="tech" domain="tech">
            Technology
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tech">Tech content</TabsContent>
      </Tabs>,
    );
    const trigger = screen.getByText('Technology');
    expect(trigger.className).toContain('data-[state=active]:border-pillar-tech');
  });

  it('has tab role', () => {
    renderTabs();
    expect(screen.getAllByRole('tab').length).toBe(2);
  });

  it('merges custom className on TabsList', () => {
    render(
      <Tabs defaultValue="one">
        <TabsList className="custom-list">
          <TabsTrigger value="one">Tab</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Content</TabsContent>
      </Tabs>,
    );
    const list = screen.getByRole('tablist');
    expect(list.className).toContain('custom-list');
  });
});
