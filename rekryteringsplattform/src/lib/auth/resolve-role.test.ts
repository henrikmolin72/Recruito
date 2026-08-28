import { describe, it, expect } from "vitest";
import { isVerifiedAdmin, resolveRouteRole } from "./resolve-role";

describe("isVerifiedAdmin", () => {
  it("trusts admin only from app_metadata (server-set)", () => {
    expect(isVerifiedAdmin({ app_metadata: { role: "admin" } })).toBe(true);
  });

  it("does NOT trust admin from user_metadata (user-writable via updateUser)", () => {
    // C1/H2 core: a forged user_metadata.role must never grant admin.
    expect(isVerifiedAdmin({ user_metadata: { role: "admin" } })).toBe(false);
    expect(
      isVerifiedAdmin({ app_metadata: { role: "company" }, user_metadata: { role: "admin" } })
    ).toBe(false);
  });

  it("is false for null/empty users", () => {
    expect(isVerifiedAdmin(null)).toBe(false);
    expect(isVerifiedAdmin(undefined)).toBe(false);
    expect(isVerifiedAdmin({})).toBe(false);
  });
});

describe("resolveRouteRole", () => {
  it("returns admin only when verified via app_metadata", () => {
    expect(resolveRouteRole({ app_metadata: { role: "admin" } })).toBe("admin");
  });

  it("collapses a forged user_metadata admin to company (no privilege via routing)", () => {
    expect(resolveRouteRole({ user_metadata: { role: "admin" } })).toBe("company");
    expect(
      resolveRouteRole({ app_metadata: { role: "company" }, user_metadata: { role: "admin" } })
    ).toBe("company");
  });

  it("routes legitimate recruiters/companies without lockout (fallback to user_metadata)", () => {
    expect(resolveRouteRole({ app_metadata: { role: "recruiter" } })).toBe("recruiter");
    expect(resolveRouteRole({ user_metadata: { role: "recruiter" } })).toBe("recruiter");
    expect(resolveRouteRole({ app_metadata: { role: "company" } })).toBe("company");
    expect(resolveRouteRole({ user_metadata: { role: "company" } })).toBe("company");
  });

  it("defaults to company for empty or unknown roles", () => {
    expect(resolveRouteRole(null)).toBe("company");
    expect(resolveRouteRole({})).toBe("company");
    expect(resolveRouteRole({ user_metadata: { role: "superuser" } })).toBe("company");
  });
});
