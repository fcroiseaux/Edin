'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

interface ArticleBodyRendererProps {
  body: string;
}

function parseContent(body: string): Record<string, unknown> | string {
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return body;
  }
}

export function ArticleBodyRenderer({ body }: ArticleBodyRendererProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
      }),
      Link.configure({ openOnClick: true }),
      Image,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    editable: false,
    content: parseContent(body),
    editorProps: {
      attributes: {
        class: 'article-prose outline-none',
      },
    },
  });

  if (!editor) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-3/4 rounded bg-surface-sunken" />
        <div className="h-4 w-full rounded bg-surface-sunken" />
        <div className="h-4 w-5/6 rounded bg-surface-sunken" />
      </div>
    );
  }

  return <EditorContent editor={editor} />;
}
