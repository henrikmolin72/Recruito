"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  itemsPerPage = 10,
  className,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display
  function getPageNumbers(): (number | "ellipsis")[] {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      // Pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }

  if (totalPages <= 1) {
    return (
      <div className={cn("flex items-center justify-center py-4", className)}>
        <p className="text-sm text-muted-foreground">
          Visar {startItem}–{endItem} av {totalItems} resultat
        </p>
      </div>
    );
  }

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-4 sm:flex-row",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        Visar {startItem}–{endItem} av {totalItems} resultat
      </p>

      <nav className="flex items-center gap-1" aria-label="Paginering">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Foregaende sida"
          className="gap-1"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Foregaende</span>
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex size-9 items-center justify-center"
                >
                  <MoreHorizontal className="size-4 text-muted-foreground" />
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <Button
                key={page}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                aria-label={`Sida ${page}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "size-9 p-0",
                  isActive && "bg-brand-600 text-white hover:bg-brand-700"
                )}
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Nasta sida"
          className="gap-1"
        >
          <span className="hidden sm:inline">Nasta</span>
          <ChevronRight className="size-4" />
        </Button>
      </nav>
    </div>
  );
}
