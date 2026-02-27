"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { rateCandidatePlacement, getCandidateRatings } from "@/lib/actions/candidates";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface CandidateRatingProps {
    candidateId: string;
    readOnly?: boolean;
}

export function CandidateRating({ candidateId, readOnly }: CandidateRatingProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [review, setReview] = useState("");
    const [existingRating, setExistingRating] = useState<{ rating: number; review: string | null } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const router = useRouter();
    const { t } = useTranslations();

    useEffect(() => {
        getCandidateRatings(candidateId).then(data => {
            if (data) {
                setExistingRating(data);
                setRating(data.rating);
                setReview(data.review || "");
            }
        });
    }, [candidateId]);

    const handleSubmit = async () => {
        if (rating === 0) return;
        setIsSubmitting(true);
        const result = await rateCandidatePlacement(candidateId, rating, review);
        if (result.error) {
            alert(t("common.error") + ": " + result.error);
        } else {
            setExistingRating({ rating, review });
            setShowForm(false);
        }
        setIsSubmitting(false);
        router.refresh();
    };

    const displayRating = hoverRating || rating;

    // Read-only star display
    if (readOnly && existingRating) {
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <Star
                        key={star}
                        className={cn(
                            "h-3.5 w-3.5",
                            star <= existingRating.rating
                                ? "fill-warning-500 text-warning-500"
                                : "text-slate-200"
                        )}
                    />
                ))}
                {existingRating.review && (
                    <span className="text-xs text-muted-foreground ml-1 truncate max-w-[120px]" title={existingRating.review}>
                        &quot;{existingRating.review}&quot;
                    </span>
                )}
            </div>
        );
    }

    if (readOnly) return null;

    // Existing rating display with edit option
    if (existingRating && !showForm) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(star => (
                        <Star
                            key={star}
                            className={cn(
                                "h-4 w-4",
                                star <= existingRating.rating
                                    ? "fill-warning-500 text-warning-500"
                                    : "text-slate-200"
                            )}
                        />
                    ))}
                </div>
                {existingRating.review && (
                    <span className="text-xs text-muted-foreground italic truncate max-w-[150px]">&quot;{existingRating.review}&quot;</span>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-muted-foreground"
                    onClick={() => setShowForm(true)}
                >
                    {t("ratings.edit")}
                </Button>
            </div>
        );
    }

    // Rating form
    if (!showForm && !existingRating) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowForm(true)}
            >
                <Star className="h-3 w-3" />
                {t("ratings.rateCandidate")}
            </Button>
        );
    }

    return (
        <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="focus:outline-none"
                    >
                        <Star
                            className={cn(
                                "h-6 w-6 transition-colors cursor-pointer",
                                star <= displayRating
                                    ? "fill-warning-500 text-warning-500"
                                    : "text-slate-200 hover:text-warning-300"
                            )}
                        />
                    </button>
                ))}
                {displayRating > 0 && (
                    <span className="text-sm font-bold ml-2">{displayRating}/5</span>
                )}
            </div>
            <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder={t("ratings.reviewPlaceholder")}
                className="flex w-full rounded-lg border border-input bg-white px-3 py-2 text-xs min-h-[60px] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <div className="flex gap-2">
                <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleSubmit}
                    disabled={isSubmitting || rating === 0}
                >
                    {isSubmitting ? "..." : t("ratings.submitRating")}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => { setShowForm(false); }}
                    disabled={isSubmitting}
                >
                    {t("common.cancel")}
                </Button>
            </div>
        </div>
    );
}
