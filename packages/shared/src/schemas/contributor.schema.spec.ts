import { describe, it, expect } from 'vitest';
import {
  createContributorSchema,
  updateContributorSchema,
  MAX_BIO_LENGTH,
} from './contributor.schema.js';

describe('createContributorSchema', () => {
  const validInput = {
    github_id: 12345,
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://github.com/avatar.png',
  };

  it('accepts valid minimal input', () => {
    const result = createContributorSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with optional fields', () => {
    const result = createContributorSchema.safeParse({
      ...validInput,
      bio: 'A short bio',
      domain: 'Technology',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all domain values', () => {
    for (const domain of ['Technology', 'Fintech', 'Impact', 'Governance']) {
      const result = createContributorSchema.safeParse({ ...validInput, domain });
      expect(result.success).toBe(true);
    }
  });

  it('rejects missing github_id', () => {
    const result = createContributorSchema.safeParse({
      name: validInput.name,
      email: validInput.email,
      avatar_url: validInput.avatar_url,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer github_id', () => {
    const result = createContributorSchema.safeParse({ ...validInput, github_id: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects negative github_id', () => {
    const result = createContributorSchema.safeParse({ ...validInput, github_id: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = createContributorSchema.safeParse({
      github_id: validInput.github_id,
      email: validInput.email,
      avatar_url: validInput.avatar_url,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createContributorSchema.safeParse({ ...validInput, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = createContributorSchema.safeParse({ ...validInput, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('accepts null email', () => {
    const result = createContributorSchema.safeParse({ ...validInput, email: null });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = createContributorSchema.safeParse({
      github_id: validInput.github_id,
      name: validInput.name,
      avatar_url: validInput.avatar_url,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid avatar_url format', () => {
    const result = createContributorSchema.safeParse({ ...validInput, avatar_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects bio exceeding max length', () => {
    const result = createContributorSchema.safeParse({
      ...validInput,
      bio: 'x'.repeat(MAX_BIO_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it('accepts bio at max length', () => {
    const result = createContributorSchema.safeParse({
      ...validInput,
      bio: 'x'.repeat(MAX_BIO_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid domain value', () => {
    const result = createContributorSchema.safeParse({ ...validInput, domain: 'InvalidDomain' });
    expect(result.success).toBe(false);
  });
});

describe('updateContributorSchema', () => {
  it('accepts valid partial update with name', () => {
    const result = updateContributorSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('accepts valid partial update with bio', () => {
    const result = updateContributorSchema.safeParse({ bio: 'Updated bio' });
    expect(result.success).toBe(true);
  });

  it('accepts valid partial update with domain', () => {
    const result = updateContributorSchema.safeParse({ domain: 'Fintech' });
    expect(result.success).toBe(true);
  });

  it('accepts valid partial update with avatar_url', () => {
    const result = updateContributorSchema.safeParse({ avatar_url: 'https://new-avatar.png' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (no fields)', () => {
    const result = updateContributorSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects system field: id', () => {
    const result = updateContributorSchema.safeParse({ id: 'some-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects system field: github_id', () => {
    const result = updateContributorSchema.safeParse({ github_id: 999 });
    expect(result.success).toBe(false);
  });

  it('rejects system field: role', () => {
    const result = updateContributorSchema.safeParse({ role: 'ADMIN' });
    expect(result.success).toBe(false);
  });

  it('rejects system field: is_active', () => {
    const result = updateContributorSchema.safeParse({ is_active: false });
    expect(result.success).toBe(false);
  });

  it('rejects bio exceeding max length', () => {
    const result = updateContributorSchema.safeParse({ bio: 'x'.repeat(MAX_BIO_LENGTH + 1) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid domain value', () => {
    const result = updateContributorSchema.safeParse({ domain: 'Space' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name string', () => {
    const result = updateContributorSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});
