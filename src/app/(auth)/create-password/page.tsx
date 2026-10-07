import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { CreatePasswordCard } from "./create-password-card";

interface CreatePasswordPageProps {
  searchParams: Promise<{ email?: string }>;
}

/**
 * Where a free member goes once GoHighLevel has registered them: they choose
 * only a password, then land on the free courses. An `email` query parameter
 * (when the link passes one) only pre-fills the field.
 */
export default async function CreatePasswordPage({ searchParams }: CreatePasswordPageProps) {
  // Someone who is already signed in has nothing to set up.
  if (await getCurrentUser()) redirect("/free-courses");

  const { email } = await searchParams;

  return <CreatePasswordCard defaultEmail={typeof email === "string" ? email : ""} />;
}
