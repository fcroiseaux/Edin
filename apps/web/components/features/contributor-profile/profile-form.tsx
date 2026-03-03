'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contributorProfileSchema } from '@edin/shared';
import type { UpdateContributorDto } from '@edin/shared';
import * as Select from '@radix-ui/react-select';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useUpdateProfile } from '../../../hooks/use-profile';
import { useToast } from '../../ui/toast';

const DOMAINS = ['Technology', 'Fintech', 'Impact', 'Governance'] as const;
const MAX_BIO = 500;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 50;

interface ProfileFormProps {
  defaultValues: {
    name: string;
    bio: string | null;
    domain: string | null;
    avatarUrl: string | null;
    skillAreas: string[];
  };
}

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateContributorDto>({
    resolver: zodResolver(contributorProfileSchema),
    defaultValues: {
      name: defaultValues.name,
      bio: defaultValues.bio ?? undefined,
      domain: (defaultValues.domain as UpdateContributorDto['domain']) ?? undefined,
      avatarUrl: defaultValues.avatarUrl ?? undefined,
      skillAreas: defaultValues.skillAreas ?? [],
    },
  });

  const bio = watch('bio') ?? '';
  const bioEditorRef = useRef<HTMLDivElement>(null);
  const skillAreas = watch('skillAreas') ?? [];
  const domain = watch('domain');

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!bioEditorRef.current) {
      return;
    }

    if (bioEditorRef.current.innerHTML !== bio) {
      bioEditorRef.current.innerHTML = bio;
    }
  }, [bio]);

  const applyBioFormat = (command: 'bold' | 'italic') => {
    bioEditorRef.current?.focus();
    document.execCommand(command);
    const nextValue = sanitizeBioHtml(bioEditorRef.current?.innerHTML ?? '');
    setValue('bio', nextValue, { shouldValidate: true, shouldDirty: true });
  };

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (!trimmed || skillAreas.length >= MAX_TAGS || trimmed.length > MAX_TAG_LENGTH) return;
    if (skillAreas.includes(trimmed)) {
      setTagInput('');
      return;
    }
    setValue('skillAreas', [...skillAreas, trimmed], { shouldValidate: true });
    setTagInput('');
  }, [tagInput, skillAreas, setValue]);

  const removeTag = (index: number) => {
    setValue(
      'skillAreas',
      skillAreas.filter((_, i) => i !== index),
      { shouldValidate: true },
    );
  };

  const onSubmit = async (data: UpdateContributorDto) => {
    try {
      await updateProfile.mutateAsync(data);
      toast({ title: 'Profile updated' });
    } catch {
      toast({
        title: 'Failed to update profile',
        variant: 'error',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-[var(--spacing-lg)]">
      {/* Display Name */}
      <div>
        <label
          htmlFor="name"
          className="block font-sans text-[14px] font-medium text-brand-primary"
        >
          Display Name
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className="mt-[var(--spacing-xs)] w-full rounded-[var(--radius-md)] border border-surface-border-input bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-primary outline-none transition-[border-color] duration-[var(--transition-fast)] focus:border-brand-accent"
        />
        {errors.name && (
          <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block font-sans text-[14px] font-medium text-brand-primary">
          Bio
        </label>
        <div className="mt-[var(--spacing-xs)] flex items-center gap-[var(--spacing-xs)]">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyBioFormat('bold')}
            className="min-h-[36px] rounded-[var(--radius-sm)] border border-surface-border-input px-[var(--spacing-sm)] font-sans text-[13px] font-medium text-brand-primary"
            aria-label="Bold"
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyBioFormat('italic')}
            className="min-h-[36px] rounded-[var(--radius-sm)] border border-surface-border-input px-[var(--spacing-sm)] font-sans text-[13px] italic text-brand-primary"
            aria-label="Italic"
          >
            I
          </button>
        </div>
        <div
          id="bio"
          ref={bioEditorRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          className="mt-[var(--spacing-xs)] min-h-[120px] w-full rounded-[var(--radius-md)] border border-surface-border-input bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-primary outline-none transition-[border-color] duration-[var(--transition-fast)] focus:border-brand-accent"
          onInput={(e) => {
            const nextValue = sanitizeBioHtml(e.currentTarget.innerHTML);
            setValue('bio', nextValue, { shouldValidate: true, shouldDirty: true });
          }}
          suppressContentEditableWarning
        />
        <div className="mt-[var(--spacing-xs)] flex items-center justify-between">
          {errors.bio ? (
            <p className="font-sans text-[13px] text-semantic-error">{errors.bio.message}</p>
          ) : (
            <span />
          )}
          <span className="font-sans text-[12px] text-brand-secondary">
            {getBioTextLength(bio)}/{MAX_BIO}
          </span>
        </div>
      </div>

      {/* Primary Domain */}
      <div>
        <label className="block font-sans text-[14px] font-medium text-brand-primary">
          Primary Domain
        </label>
        <Select.Root
          value={domain ?? ''}
          onValueChange={(val) =>
            setValue('domain', val as UpdateContributorDto['domain'], { shouldValidate: true })
          }
        >
          <Select.Trigger
            className="mt-[var(--spacing-xs)] flex min-h-[44px] w-full items-center justify-between rounded-[var(--radius-md)] border border-surface-border-input bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-primary outline-none transition-[border-color] duration-[var(--transition-fast)] focus:border-brand-accent"
            aria-label="Primary Domain"
          >
            <Select.Value placeholder="Select a domain" />
            <Select.Icon className="text-brand-secondary">
              <ChevronDownIcon />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="overflow-hidden rounded-[var(--radius-md)] border border-surface-border bg-surface-raised shadow-[var(--shadow-card)]"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport className="p-[var(--spacing-xs)]">
                {DOMAINS.map((d) => (
                  <Select.Item
                    key={d}
                    value={d}
                    className="flex min-h-[44px] cursor-pointer items-center rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[15px] text-brand-primary outline-none data-[highlighted]:bg-surface-sunken"
                  >
                    <Select.ItemText>{d}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        {errors.domain && (
          <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error">
            {errors.domain.message}
          </p>
        )}
      </div>

      {/* Skill Areas */}
      <div>
        <label
          htmlFor="skill-input"
          className="block font-sans text-[14px] font-medium text-brand-primary"
        >
          Skill Areas
        </label>
        <div className="mt-[var(--spacing-xs)] flex gap-[var(--spacing-xs)]">
          <input
            id="skill-input"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            maxLength={MAX_TAG_LENGTH}
            placeholder="Add a skill..."
            disabled={skillAreas.length >= MAX_TAGS}
            className="flex-1 rounded-[var(--radius-md)] border border-surface-border-input bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-primary outline-none transition-[border-color] duration-[var(--transition-fast)] focus:border-brand-accent disabled:opacity-50"
          />
          <button
            type="button"
            onClick={addTag}
            disabled={skillAreas.length >= MAX_TAGS || !tagInput.trim()}
            className="min-h-[44px] rounded-[var(--radius-md)] bg-brand-primary px-[var(--spacing-md)] font-sans text-[14px] font-medium text-surface-raised transition-opacity duration-[var(--transition-fast)] hover:opacity-90 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {skillAreas.length > 0 && (
          <div className="mt-[var(--spacing-sm)] flex flex-wrap gap-[var(--spacing-xs)]">
            {skillAreas.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="inline-flex items-center gap-[var(--spacing-xs)] rounded-[var(--radius-lg)] bg-brand-accent-subtle px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[13px] text-brand-primary"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(i)}
                  aria-label={`Remove ${tag}`}
                  className="ml-[2px] inline-flex h-[20px] w-[20px] items-center justify-center rounded-full text-brand-secondary transition-colors duration-[var(--transition-fast)] hover:bg-brand-accent hover:text-surface-raised"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-secondary">
          {skillAreas.length}/{MAX_TAGS} skills (press Enter or click Add)
        </p>
        {errors.skillAreas && (
          <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error">
            {typeof errors.skillAreas.message === 'string'
              ? errors.skillAreas.message
              : 'Invalid skill areas'}
          </p>
        )}
      </div>

      {/* Avatar URL */}
      <div>
        <label
          htmlFor="avatarUrl"
          className="block font-sans text-[14px] font-medium text-brand-primary"
        >
          Profile Photo URL
        </label>
        <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-secondary">
          Synced from GitHub by default. Provide a URL to override.
        </p>
        <input
          id="avatarUrl"
          type="url"
          {...register('avatarUrl')}
          placeholder="https://..."
          className="mt-[var(--spacing-xs)] w-full rounded-[var(--radius-md)] border border-surface-border-input bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-primary outline-none transition-[border-color] duration-[var(--transition-fast)] focus:border-brand-accent"
        />
        {errors.avatarUrl && (
          <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error">
            {errors.avatarUrl.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-[44px] rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-xl)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-opacity duration-[var(--transition-fast)] hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
}

function sanitizeBioHtml(rawHtml: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const allowedTags = new Set(['B', 'I', 'EM', 'STRONG', 'BR', 'P']);

  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;

      if (!allowedTags.has(element.tagName)) {
        const parent = element.parentNode;
        while (element.firstChild) {
          parent?.insertBefore(element.firstChild, element);
        }
        parent?.removeChild(element);
        return;
      }

      for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name);
      }
    }

    for (const child of Array.from(node.childNodes)) {
      walk(child);
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
}

function getBioTextLength(value: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'text/html');
  return (doc.body.textContent ?? '').trim().length;
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
