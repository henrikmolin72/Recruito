"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Info, X } from "lucide-react";
import { acceptCandidateProfileNotice } from "@/lib/actions/company";

type Props = {
  href: string;
  noticeAccepted: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Wraps a link to a candidate profile. The first time a company opens any
 * candidate (notice not yet accepted) it intercepts the click and shows a
 * one-time confirmation popup; on accept it records the company-level flag and
 * navigates. Once accepted, it renders a plain Link.
 */
export function CandidateAccessGate({ href, noticeAccepted, className, children }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (noticeAccepted) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  const handleAccept = () => {
    startTransition(async () => {
      await acceptCandidateProfileNotice();
      router.push(href);
    });
  };

  return (
    <>
      <a
        role="button"
        tabIndex={0}
        className={`cursor-pointer ${className ?? ""}`}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
      </a>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <Dialog.Title className="text-base font-bold text-slate-900">
                Confirm Candidate Profile View
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <Dialog.Description className="text-sm leading-relaxed text-slate-600 space-y-2">
                <span className="block">
                  Viewing this candidate profile will notify the recruiter that the profile has been viewed.
                </span>
                <span className="block">
                  To support a positive recruiter experience, we recommend providing timely feedback and
                  making a hiring decision within <strong>45 days</strong>, where possible.
                </span>
              </Dialog.Description>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleAccept}
                disabled={pending}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {pending ? "Opening…" : "Accept & Continue"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
