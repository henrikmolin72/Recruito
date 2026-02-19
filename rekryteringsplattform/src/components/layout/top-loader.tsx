"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function TopLoader() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const startTimer = setTimeout(() => setLoading(true), 0);
        const endTimer = setTimeout(() => setLoading(false), 500);
        return () => {
            clearTimeout(startTimer);
            clearTimeout(endTimer);
        };
    }, [pathname, searchParams]);

    return (
        <AnimatePresence>
            {loading && (
                <motion.div
                    initial={{ width: "0%", opacity: 1 }}
                    animate={{ width: "100%", opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="fixed top-0 left-0 h-1 bg-brand-500 z-[9999] shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                />
            )}
        </AnimatePresence>
    );
}
