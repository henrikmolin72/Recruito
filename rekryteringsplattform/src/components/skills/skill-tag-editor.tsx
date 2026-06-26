"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, X, Loader2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Skill {
    id: string;
    name: string;
    slug: string;
    category: string;
}

interface CandidateSkill {
    id: string;
    skill_id: string;
    source: string;
    is_gap: boolean;
    skill: Skill;
}

interface SkillTagEditorProps {
    candidateId: string;
    readOnly?: boolean;
    className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
    technical: "border-blue-200 bg-blue-50 text-blue-700",
    tool: "border-violet-200 bg-violet-50 text-violet-700",
    soft: "border-green-200 bg-green-50 text-green-700",
    language: "border-amber-200 bg-amber-50 text-amber-700",
    domain: "border-rose-200 bg-rose-50 text-rose-700",
};

const GAP_COLOR = "border-red-200 bg-red-50 text-red-600 line-through opacity-70";

export function SkillTagEditor({ candidateId, readOnly = false, className }: SkillTagEditorProps) {
    const [skills, setSkills] = useState<CandidateSkill[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Skill[]>([]);
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [showSuggest, setShowSuggest] = useState(false);
    const [removing, setRemoving] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load existing skills
    useEffect(() => {
        async function load() {
            const res = await fetch(`/api/candidate-skills?candidateId=${candidateId}`);
            if (res.ok) {
                const data = await res.json();
                setSkills(data.skills ?? []);
            }
            setLoading(false);
        }
        load();
    }, [candidateId]);

    // Debounced search
    const searchSkills = useCallback((q: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!q.trim()) { setSuggestions([]); return; }

        debounceRef.current = setTimeout(async () => {
            setSuggestLoading(true);
            try {
                const res = await fetch(`/api/skills?q=${encodeURIComponent(q)}`);
                const data = await res.json();
                // Filter out already-added skills
                const addedIds = new Set(skills.map((s) => s.skill_id));
                setSuggestions((data.skills ?? []).filter((s: Skill) => !addedIds.has(s.id)));
            } finally {
                setSuggestLoading(false);
            }
        }, 250);
    }, [skills]);

    function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value;
        setQuery(val);
        setShowSuggest(true);
        searchSkills(val);
    }

    async function handleAdd(skill: Skill) {
        setQuery("");
        setSuggestions([]);
        setShowSuggest(false);

        const res = await fetch("/api/candidate-skills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidateId, skillId: skill.id, isGap: false }),
        });

        if (res.ok) {
            setSkills((prev) => [
                ...prev,
                { id: crypto.randomUUID(), skill_id: skill.id, source: "manual", is_gap: false, skill },
            ]);
        }
    }

    async function handleRemove(skillId: string) {
        setRemoving(skillId);
        const res = await fetch(`/api/candidate-skills?candidateId=${candidateId}&skillId=${skillId}`, {
            method: "DELETE",
        });
        if (res.ok) {
            setSkills((prev) => prev.filter((s) => s.skill_id !== skillId));
        }
        setRemoving(null);
    }

    const present = skills.filter((s) => !s.is_gap);
    const gaps = skills.filter((s) => s.is_gap);

    if (loading) {
        return (
            <div className={cn("flex items-center gap-2 text-xs text-slate-400", className)}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading skills...
            </div>
        );
    }

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Skills</p>
            </div>

            {/* Present skills */}
            {present.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {present.map((cs) => (
                        <span
                            key={cs.skill_id}
                            className={cn(
                                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                                CATEGORY_COLORS[cs.skill.category] ?? "border-slate-200 bg-slate-50 text-slate-600"
                            )}
                        >
                            {cs.skill.name}
                            {!readOnly && (
                                <button
                                    onClick={() => handleRemove(cs.skill_id)}
                                    disabled={removing === cs.skill_id}
                                    className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                                >
                                    {removing === cs.skill_id ? (
                                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                    ) : (
                                        <X className="h-2.5 w-2.5" />
                                    )}
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}

            {/* Gap skills */}
            {gaps.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-slate-400 self-center">Missing:</span>
                    {gaps.map((cs) => (
                        <span
                            key={cs.skill_id}
                            className={cn(
                                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                                GAP_COLOR
                            )}
                        >
                            {cs.skill.name}
                        </span>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {present.length === 0 && gaps.length === 0 && !readOnly && (
                <p className="text-xs text-slate-400 italic">No skills tagged yet — search to add.</p>
            )}

            {/* Add skill input */}
            {!readOnly && (
                <div className="relative">
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 focus-within:border-brand-400 transition-colors">
                        <Plus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={handleQueryChange}
                            onFocus={() => query && setShowSuggest(true)}
                            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                            placeholder="Search and add skills..."
                            className="flex-1 text-xs bg-transparent outline-none placeholder:text-slate-400"
                        />
                        {suggestLoading && <Loader2 className="h-3 w-3 animate-spin text-slate-400 shrink-0" />}
                    </div>

                    {showSuggest && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
                            {suggestions.slice(0, 8).map((skill) => (
                                <button
                                    key={skill.id}
                                    onMouseDown={() => handleAdd(skill)}
                                    className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-left"
                                >
                                    <span className="font-semibold text-slate-700">{skill.name}</span>
                                    <span className={cn(
                                        "rounded px-1.5 py-0.5 text-[10px] font-bold border",
                                        CATEGORY_COLORS[skill.category] ?? "border-slate-200 bg-slate-50 text-slate-500"
                                    )}>
                                        {skill.category}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
