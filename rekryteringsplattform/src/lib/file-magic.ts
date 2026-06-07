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
    const sample = bytes.slice(0, Math.min(bytes.length, 512));
    if (sample.length === 0) return false;
    let printable = 0;
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

const IMAGE_SIGNATURES: Record<"jpg" | "png" | "webp", number[][]> = {
    jpg: [[0xff, 0xd8, 0xff]], // JPEG SOI
    png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]], // PNG
    webp: [[0x52, 0x49, 0x46, 0x46]], // RIFF (WEBP container; "WEBP" at offset 8)
};

/**
 * Verify a profile-image file's content matches the declared extension.
 * Rejects spoofed/SVG/script payloads regardless of filename or client MIME.
 */
export async function verifyImageFileContent(file: File, extension: string): Promise<boolean> {
    const ext = extension.toLowerCase();
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());

    if (ext === "jpg" || ext === "jpeg") return matchesAny(head, IMAGE_SIGNATURES.jpg);
    if (ext === "png") return matchesAny(head, IMAGE_SIGNATURES.png);
    if (ext === "webp") {
        // RIFF header + "WEBP" fourcc at bytes 8..11
        return matchesAny(head, IMAGE_SIGNATURES.webp)
            && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
    }
    return false;
}
