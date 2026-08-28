// Role resolution for route gating. app_metadata.role is the ONLY trusted source
// of the admin grant — it is service-role-set and not user-writable, unlike
// user_metadata.role which any user can set via auth.updateUser(). Keeping the
// user_metadata fallback for non-privileged routing avoids locking out company/
// recruiter users, while a forged user_metadata "admin" can never yield admin.

type MetaUser =
  | {
      app_metadata?: { role?: string | null; [k: string]: unknown } | null;
      user_metadata?: { role?: string | null; [k: string]: unknown } | null;
    }
  | null
  | undefined;

export type RouteRole = "admin" | "company" | "recruiter";

export function isVerifiedAdmin(user: MetaUser): boolean {
  return user?.app_metadata?.role === "admin";
}

export function resolveRouteRole(user: MetaUser): RouteRole {
  if (isVerifiedAdmin(user)) return "admin";
  const claimed = user?.app_metadata?.role || user?.user_metadata?.role;
  if (claimed === "recruiter") return "recruiter";
  // company default; unknown, empty, or a forged "admin" all collapse here.
  return "company";
}
