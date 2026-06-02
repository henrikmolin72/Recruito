"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders the AI screening report markdown (GFM tables) with explicit table
 * styling — the project has no @tailwindcss/typography plugin, so we style
 * elements directly rather than relying on `prose`.
 */
export function MarkdownReport({ markdown }: { markdown: string }) {
  return (
    <div className="text-sm text-slate-700 leading-relaxed space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-lg font-black text-slate-900 mt-5 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-black text-slate-900 mt-4 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold text-slate-800 mt-3 mb-1">{children}</h3>,
          p: ({ children }) => <p className="mb-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
          strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
          hr: () => <hr className="my-4 border-slate-200" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-slate-200">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => (
            <th className="border border-slate-200 px-2 py-1.5 text-left font-bold text-slate-600 align-top">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 px-2 py-1.5 align-top">{children}</td>
          ),
          code: ({ children }) => (
            <code className="bg-slate-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
