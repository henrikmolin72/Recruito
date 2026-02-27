"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="sv">
            <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
                <h1>Något gick fel</h1>
                <p style={{ color: "#666" }}>{error.message}</p>
                <button
                    onClick={reset}
                    style={{
                        marginTop: "1rem",
                        padding: "0.5rem 1rem",
                        background: "#1B4F72",
                        color: "white",
                        border: "none",
                        borderRadius: "0.375rem",
                        cursor: "pointer",
                    }}
                >
                    Försök igen
                </button>
            </body>
        </html>
    );
}
