'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';

interface SlashMenuItem {
  label: string;
  description: string;
  action: (editor: Editor) => void;
}

const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  {
    label: 'Heading 2',
    description: 'Large section heading',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: 'Heading 3',
    description: 'Medium section heading',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: 'Heading 4',
    description: 'Small section heading',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  {
    label: 'Code Block',
    description: 'Syntax-highlighted code',
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: 'Blockquote',
    description: 'Pull quote or citation',
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    label: 'Bullet List',
    description: 'Unordered list',
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: 'Numbered List',
    description: 'Ordered list',
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    label: 'Horizontal Divider',
    description: 'Section separator',
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    label: 'Image',
    description: 'Insert image from URL',
    action: (editor) => {
      const url = window.prompt('Image URL:');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
];

interface SlashMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
}

export function SlashMenu({ editor, isOpen, onClose, position }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredItems = SLASH_MENU_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(filter.toLowerCase()) ||
      item.description.toLowerCase().includes(filter.toLowerCase()),
  );

  const resetAndClose = useCallback(() => {
    setFilter('');
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (item: SlashMenuItem) => {
      if (editor) {
        item.action(editor);
        resetAndClose();
      }
    },
    [editor, resetAndClose],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        resetAndClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, handleSelect, resetAndClose]);

  if (!isOpen || !editor) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-[240px] rounded-[var(--radius-md)] border border-surface-border bg-surface-raised shadow-lg"
      style={{ top: position.top, left: position.left }}
      role="listbox"
      aria-label="Insert block"
    >
      {filteredItems.map((item, index) => (
        <button
          key={item.label}
          className={`flex w-full flex-col px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left transition-colors ${
            index === selectedIndex ? 'bg-brand-accent-subtle' : 'hover:bg-surface-sunken'
          }`}
          onClick={() => handleSelect(item)}
          role="option"
          aria-selected={index === selectedIndex}
        >
          <span className="font-sans text-[14px] font-medium text-brand-primary">{item.label}</span>
          <span className="font-sans text-[12px] text-brand-secondary">{item.description}</span>
        </button>
      ))}
      {filteredItems.length === 0 && (
        <div className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
          No matching blocks
        </div>
      )}
    </div>
  );
}

export { SLASH_MENU_ITEMS };
