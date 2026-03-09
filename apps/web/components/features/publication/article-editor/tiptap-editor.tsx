'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useState, useCallback, useEffect, useRef } from 'react';
import { SlashMenu } from './slash-menu';

const lowlight = createLowlight(common);

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false, // replaced by CodeBlockLowlight
      }),
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({
        placeholder: placeholder ?? 'Start writing your article...',
      }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: parseContent(content),
    onUpdate: ({ editor: ed }) => {
      onChange(JSON.stringify(ed.getJSON()));
    },
    editorProps: {
      attributes: {
        class: 'prose-editor',
      },
      handleKeyDown: (view, event) => {
        if (event.key === '/' && !slashMenuOpen) {
          const coords = view.coordsAtPos(view.state.selection.from);
          setSlashMenuPos({ top: coords.bottom + 4, left: coords.left });
          setSlashMenuOpen(true);
          return false; // Let "/" be typed, we'll remove it on selection
        }
        return false;
      },
    },
  });

  const handleSlashMenuClose = useCallback(() => {
    setSlashMenuOpen(false);
    if (editor) {
      // Delete the "/" character that triggered the menu
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from);
      if (textBefore === '/') {
        editor
          .chain()
          .focus()
          .deleteRange({ from: from - 1, to: from })
          .run();
      }
    }
  }, [editor]);

  // Sync external content changes (e.g., loading saved draft)
  useEffect(() => {
    if (editor && content) {
      const parsed = parseContent(content);
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
      if (currentJson !== newJson && typeof parsed !== 'string') {
        editor.commands.setContent(parsed);
      }
    }
  }, [editor, content]);

  if (!editor) {
    return <div className="h-[400px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />;
  }

  return (
    <div className="tiptap-editor-wrapper" ref={editorWrapperRef}>
      <EditorContent
        editor={editor}
        className="min-h-[400px] font-serif text-[17px] leading-[1.65] text-brand-primary"
      />
      <SlashMenu
        editor={editor}
        isOpen={slashMenuOpen}
        onClose={handleSlashMenuClose}
        position={slashMenuPos}
      />
      <style>{`
        .prose-editor {
          outline: none;
          max-width: 100%;
        }
        .prose-editor h2 {
          font-family: var(--font-serif, 'Libre Baskerville', serif);
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.3;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
        }
        .prose-editor h3 {
          font-family: var(--font-serif, 'Libre Baskerville', serif);
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .prose-editor h4 {
          font-family: var(--font-serif, 'Libre Baskerville', serif);
          font-size: 1.125rem;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .prose-editor p {
          margin-bottom: 1rem;
        }
        .prose-editor blockquote {
          border-left: 3px solid var(--color-brand-accent, #C4956A);
          padding-left: 1rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: var(--color-brand-secondary, #6B7B8D);
        }
        .prose-editor pre {
          background: var(--color-surface-sunken, #F2F0EB);
          border-radius: 8px;
          padding: 1rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.875rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .prose-editor code {
          background: var(--color-surface-sunken, #F2F0EB);
          border-radius: 4px;
          padding: 0.15rem 0.3rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.875em;
        }
        .prose-editor pre code {
          background: none;
          padding: 0;
        }
        .prose-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1.5rem 0;
        }
        .prose-editor a {
          color: var(--color-brand-accent, #C4956A);
          text-decoration: underline;
        }
        .prose-editor ul, .prose-editor ol {
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .prose-editor li {
          margin-bottom: 0.25rem;
        }
        .prose-editor hr {
          border: none;
          border-top: 1px solid var(--color-surface-border, #E8E6E1);
          margin: 2rem 0;
        }
        .prose-editor .is-editor-empty:first-child::before {
          color: var(--color-brand-secondary, #6B7B8D);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

function parseContent(content: string): Record<string, unknown> | string {
  if (!content) return '';
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}
