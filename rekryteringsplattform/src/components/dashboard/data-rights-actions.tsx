"use client";

import { useState, useTransition } from "react";
import { exportMyData, requestAccountErasure } from "@/lib/actions/data-rights";
import { toast } from "sonner";

export function DataRightsActions() {
    const [isExporting, startExport] = useTransition();
    const [isRequesting, startErasure] = useTransition();
    const [reason, setReason] = useState("");
    const [erasureDialogOpen, setErasureDialogOpen] = useState(false);

    function handleExport() {
        startExport(async () => {
            const result = await exportMyData();
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            // Stream the JSON straight to a downloaded file. No server-side
            // storage of the dump — avoids creating a new retention problem.
            const blob = new Blob([result.data], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success("Export klar — kontrollera dina nedladdningar.");
        });
    }

    function handleErasureSubmit(e: React.FormEvent) {
        e.preventDefault();
        startErasure(async () => {
            const result = await requestAccountErasure(reason);
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            setErasureDialogOpen(false);
            setReason("");
            toast.success("Begäran skickad. En administratör hör av sig inom 30 dagar.");
        });
    }

    return (
        <div className="space-y-8">
            <section className="rounded-lg border border-gray-200 p-5">
                <h2 className="text-lg font-semibold text-gray-900">Exportera mina data</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Laddar ned en JSON-fil med alla uppgifter vi har om dig — profil, uppdrag,
                    kandidater du registrerat, placeringar, meddelanden och notifikationer.
                    Filen genereras direkt i webbläsaren, vi sparar ingen kopia.
                </p>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="mt-4 inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {isExporting ? "Förbereder export..." : "Ladda ned mina data"}
                </button>
            </section>

            <section className="rounded-lg border border-red-200 bg-red-50 p-5">
                <h2 className="text-lg font-semibold text-red-900">Radera mitt konto</h2>
                <p className="mt-1 text-sm text-red-800">
                    Begär att vi raderar ditt konto och dina personuppgifter. Uppgifter
                    kopplade till genomförda placeringar (faktura, anställningsbevis) sparas
                    i 7 år enligt bokföringslagen — men kopplingen till dig anonymiseras.
                    En administratör behandlar din begäran inom 30 dagar.
                </p>

                {!erasureDialogOpen ? (
                    <button
                        type="button"
                        onClick={() => setErasureDialogOpen(true)}
                        className="mt-4 inline-flex items-center rounded border border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                        Begär radering...
                    </button>
                ) : (
                    <form onSubmit={handleErasureSubmit} className="mt-4 space-y-3">
                        <label className="block">
                            <span className="text-sm font-medium text-red-900">
                                Anledning (frivilligt — hjälper oss förbättra tjänsten):
                            </span>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                maxLength={1000}
                                rows={3}
                                className="mt-1 block w-full rounded border border-red-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="submit"
                                disabled={isRequesting}
                                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {isRequesting ? "Skickar..." : "Skicka begäran"}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setErasureDialogOpen(false); setReason(""); }}
                                className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Avbryt
                            </button>
                        </div>
                    </form>
                )}
            </section>

            <p className="text-xs text-gray-500">
                Läs mer om hur vi behandlar personuppgifter i{" "}
                <a href="/integritetspolicy" className="underline hover:text-gray-700">Integritetspolicy</a>
                {" "}och{" "}
                <a href="/gdpr" className="underline hover:text-gray-700">GDPR-rättigheter</a>.
            </p>
        </div>
    );
}
