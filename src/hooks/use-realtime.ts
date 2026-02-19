"use client";
import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  onInsert?: (payload: Record<string, unknown>) => void;
  onUpdate?: (payload: Record<string, unknown>) => void;
  onDelete?: (payload: Record<string, unknown>) => void;
}

export function useRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeOptions) {
  const supabase = createClient();

  const setupSubscription = useCallback(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table,
          filter,
        },
        (payload: {
          eventType: "INSERT" | "UPDATE" | "DELETE";
          new: Record<string, unknown>;
          old: Record<string, unknown>;
        }) => {
          if (payload.eventType === "INSERT" && onInsert) {
            onInsert(payload.new);
          } else if (payload.eventType === "UPDATE" && onUpdate) {
            onUpdate(payload.new);
          } else if (payload.eventType === "DELETE" && onDelete) {
            onDelete(payload.old);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, onInsert, onUpdate, onDelete, supabase]);

  useEffect(() => {
    return setupSubscription();
  }, [setupSubscription]);
}
