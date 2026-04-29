/**
 * Server-side magic-byte validation for uploaded files.
 *
 * Why: client-supplied `file.type` and extensions can be spoofed. CLAUDE.md
 * §6 requires content-based MIME validation. Read the first bytes and
 * compare against known magic numbers for each declared CV format.
 */

type CvCategory = "pdf" | "doc" | "docx" | "rtf" | "txt";

const SIGNATURES: Record<Exclude<CvCategory, "txt">, number[][]> = {
    pdf: [[0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
    doc: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]], // OLE compound
    docx: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06], [0x50, 0x4b, 0x07, 0x08]], // ZIP
    rtf: [[0x7b, 0x5c, 0x72, 0x74, 0x66]], // {\rtf
};

function matchesAny(bytes: Uint8Array, sigs: number[][]): boolean {
    return sigs.some(sig => sig.every((b, i) => bytes[i] === b));
}

function isMostlyPrintable(bytes: Uint8Array): boolean {
    let printable = 0;
    const sample = bytes.slice(0, Math.min(bytes.length, 512));
    for (const b of sample) {
        if (b === 0x09 || b === 0x0a || b === 0x0d || (b >= 0x20 && b <= 0x7e) || b >= 0x80) {
            printable++;
        }
    }
    return printable / sample.length > 0.9;
}

/**
 * Verify a CV file's actual content matches the declared extension.
 * Returns true if content is consistent with the extension's magic bytes.
 */
export async function verifyCvFileContent(file: File, extension: string): Promise<boolean> {
    const ext = extension.toLowerCase();
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());

    if (ext === "pdf") return matchesAny(head, SIGNATURES.pdf);
    if (ext === "doc") return matchesAny(head, SIGNATURES.doc);
    if (ext === "docx") return matchesAny(head, SIGNATURES.docx);
    if (ext === "rtf") return matchesAny(head, SIGNATURES.rtf);
    if (ext === "txt") {
        const sample = new Uint8Array(await file.slice(0, 512).arrayBuffer());
        return isMostlyPrintable(sample);
    }
    return false;
}
