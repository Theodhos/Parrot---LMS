import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Role } from "@/generated/prisma";

export default async function HomePage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  if (user.role === Role.STUDENT) {
    redirect("/dashboard");
  } else {
    redirect("/admin/dashboard");
  }
}
