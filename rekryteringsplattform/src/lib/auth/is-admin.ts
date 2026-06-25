// Canonical "is this user an admin" check. app_metadata.role is the server-set,
// non-user-writable source of truth that requireAdmin() and the admin route surface
// trust; profiles.role is OR'd in for resilience against drift between the two.
// Use this everywhere instead of re-checking profiles.role inline (which diverges
// from app_metadata and has caused admins to be wrongly denied — e.g. screening).

type AdminUser = { app_metadata?: { role?: string | null; [key: string]: unknown } | null } | null | undefined;
type AdminProfile = { role?: string | null } | null | undefined;

export function isAdminUser(user: AdminUser, profile?: AdminProfile): boolean {
  if (user?.app_metadata?.role === "admin") return true;
  return profile?.role === "admin";
}
