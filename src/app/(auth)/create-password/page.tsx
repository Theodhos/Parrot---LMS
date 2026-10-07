import { CreatePasswordCard } from "./create-password-card";

interface CreatePasswordPageProps {
  searchParams: Promise<{ email?: string }>;
}

/**
 * Where a free member goes once GoHighLevel has registered them: they choose
 * only a password, then land on the free courses. An `email` query parameter
 * (when the link passes one) only pre-fills the field. The form is always
 * shown, even to a browser that is signed in as someone else.
 */
export default async function CreatePasswordPage({ searchParams }: CreatePasswordPageProps) {
  const { email } = await searchParams;

  return <CreatePasswordCard defaultEmail={typeof email === "string" ? email : ""} />;
}
