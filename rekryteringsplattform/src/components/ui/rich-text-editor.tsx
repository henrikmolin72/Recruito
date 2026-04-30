"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, List, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "min-h-[160px] px-4 py-3 text-sm leading-relaxed focus:outline-none [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5",
      },
    },
  });

  const buttonClass = "p-1.5 rounded hover:bg-slate-100 transition-colors";
  const activeClass = "bg-slate-200";

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-brand-500 transition-all", className)}>
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-100">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={cn(buttonClass, editor?.isActive("bold") && activeClass)}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={cn(buttonClass, editor?.isActive("bulletList") && activeClass)}
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={cn(buttonClass, editor?.isActive("orderedList") && activeClass)}
          title="Numbered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
      </div>
      {!value && !editor?.isFocused && (
        <div className="absolute pointer-events-none px-4 py-3 text-sm text-muted-foreground">{placeholder}</div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
