import { redirect } from "next/navigation";

// Placements management merged into /admin/guarantees (client request 2026-07-09:
// one "Guarantees" surface with Joining Date + Guarantee Ends). Route kept so old
// links and bookmarks keep working.
export default function AdminPlacementsPage() {
    redirect("/admin/guarantees");
}
