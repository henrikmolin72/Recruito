import { describe, it, expect } from "vitest";
import { csvEscapeCell } from "./csv";

describe("csvEscapeCell", () => {
    it("neutralizes formula-injection prefixes by prepending a quote", () => {
        expect(csvEscapeCell("=cmd|' /C calc'!A1")).toBe(`"'=cmd|' /C calc'!A1"`);
        expect(csvEscapeCell("@SUM(1+1)")).toBe(`"'@SUM(1+1)"`);
        expect(csvEscapeCell("+1")).toBe(`"'+1"`);
        expect(csvEscapeCell("-2")).toBe(`"'-2"`);
    });

    it("doubles embedded quotes", () => {
        expect(csvEscapeCell('a "b" c')).toBe(`"a ""b"" c"`);
    });

    it("leaves safe values quoted but unprefixed", () => {
        expect(csvEscapeCell("Developer")).toBe(`"Developer"`);
        expect(csvEscapeCell(42)).toBe(`"42"`);
        expect(csvEscapeCell(null)).toBe(`""`);
    });
});
