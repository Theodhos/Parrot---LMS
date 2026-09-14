import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

// Coarse, route-level gate only (Next.js 16 "Proxy" -- the renamed
// Middleware). Every domain action/API handler re-checks authentication and
// role/ownership server-side — this just avoids flashing protected pages to
// signed-out visitors or the wrong role.
const STUDENT_PREFIXES = ["/dashboard", "/learn", "/analytics", "/profile"];
const ADMIN_PREFIX = "/admin";

export default auth((req) => {
  const { nextUrl } = req;
  const user = req.auth?.user;

  const isAdminRoute = nextUrl.pathname.startsWith(ADMIN_PREFIX);
  const isStudentRoute = STUDENT_PREFIXES.some((prefix) => nextUrl.pathname.startsWith(prefix));

  if ((isAdminRoute || isStudentRoute) && !user) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && user && user.role !== "ADMIN" && user.role !== "INSTRUCTOR") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

// Next.js 16 renamed middleware.ts -> proxy.ts (the old file is silently
// ignored, not an error -- easy to miss). Proxy defaults to the Node.js
// runtime, which is required here anyway since Auth.js's Credentials
// provider + PrismaAdapter need Prisma's native engine. Setting `runtime`
// in this config is no longer valid for Proxy and throws.
export const config = {
  matcher: ["/dashboard/:path*", "/learn/:path*", "/analytics/:path*", "/profile/:path*", "/admin/:path*"],
};
