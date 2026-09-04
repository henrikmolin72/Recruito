"use client";

import { useEffect } from "react";
import { touchPresence } from "@/lib/actions/presence";

const HEARTBEAT_MS = 60_000;

/** Keeps the caller's presence session alive while a dashboard tab is visible. Renders nothing. */
export function PresenceHeartbeat() {
    useEffect(() => {
        const beat = () => {
            if (document.visibilityState === "visible") void touchPresence();
        };
        beat();
        const interval = setInterval(beat, HEARTBEAT_MS);
        document.addEventListener("visibilitychange", beat);
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", beat);
        };
    }, []);
    return null;
}
