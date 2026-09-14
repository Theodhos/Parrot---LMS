import type { Role } from "@/generated/prisma";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      wordpressUserId: number | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    wordpressUserId: number | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    wordpressUserId: number | null;
  }
}
