import { describe, it, expect } from "vitest";
import { normalizeIndustry, INDUSTRY_OPTIONS } from "./job-form-options";

describe("normalizeIndustry — map legacy sector labels to the current taxonomy", () => {
    it("maps each legacy label to a value that IS in the current INDUSTRY_OPTIONS", () => {
        const cases: [string, string][] = [
            ["Agriculture", "Agriculture & Agribusiness"],
            ["Construction & Real Estate", "Construction, Real Estate, Architecture & Infrastructure"],
            ["Construction Materials & Infrastructure", "Construction, Real Estate, Architecture & Infrastructure"],
            ["Education", "Education & Training"],
            ["Energy & Utilities", "Energy, Utilities & Environmental Services"],
            ["Environmental Services", "Energy, Utilities & Environmental Services"],
            ["Financial Services", "Banking & Financial Services"],
            ["FMCG", "FMCG, Food & Beverage & Consumer Goods"],
            ["Healthcare", "Healthcare, Wellness & Fitness"],
            ["IT - Artificial Intelligence", "IT - Artificial Intelligence, Data & Analytics"],
            ["IT - SaaS / Software", "IT - Information Technology, Software, SaaS & IT Services"],
            ["IT - Services", "IT - Information Technology, Software, SaaS & IT Services"],
            ["Logistics & Transportation", "Logistics, Supply Chain & Transportation"],
            ["Manufacturing", "Manufacturing & Engineering"],
            ["Media & Entertainment", "Advertising, Marketing, Media & Broadcasting"],
            ["Mining & Metals", "Mining, Metals, Oil & Gas"],
            ["Oil & Gas", "Mining, Metals, Oil & Gas"],
            ["Pharmaceutical", "Pharmaceuticals"],
            ["Professional Services", "Consulting & Professional Services"],
            ["Retail & E-commerce", "Retail, Wholesale & E-commerce"],
            ["Telecommunications", "Telecommunications & Internet Services"],
            ["Textile & Apparel", "Textile, Leather, Apparel, Footwear & Home Textiles"],
            ["Others", "Other"],
        ];
        for (const [legacy, expected] of cases) {
            expect(normalizeIndustry(legacy)).toBe(expected);
            expect(INDUSTRY_OPTIONS as readonly string[]).toContain(expected);
        }
    });

    it("passes through a value that is already current, unchanged", () => {
        for (const current of ["Automotive", "Insurance", "Legal Services", "Medical Devices", "Other"]) {
            expect(normalizeIndustry(current)).toBe(current);
        }
    });

    it("passes through unknown free-text and empty values unchanged", () => {
        expect(normalizeIndustry("our own weird label")).toBe("our own weird label");
        expect(normalizeIndustry("")).toBe("");
    });
});
