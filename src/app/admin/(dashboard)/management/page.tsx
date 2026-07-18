import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ManagementClient } from "./management-client";

export default async function ManagementPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  if (session.user.role !== "SUPERADMIN") redirect("/admin");

  return <ManagementClient currentUserId={session.user.id} />;
}
