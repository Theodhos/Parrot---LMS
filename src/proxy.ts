import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";

// Coarse, route-level gate only (Next.js 16 "Proxy" -- the renamed
// Middleware). Every domain action/API handler re-checks authentication and
// role/ownership server-side — this just avoids flashing protected pages to
// signed-out visitors or the wrong role.
const STUDENT_PREFIXES = ["/dashboard", "/courses", "/free-courses", "/analytics", "/profile", "/community", "/calendar", "/support"];
const ADMIN_PREFIX = "/admin";

export default auth(async (req) => {
  const { nextUrl } = req;
  const user = req.auth?.user;

  const isAdminRoute = nextUrl.pathname.startsWith(ADMIN_PREFIX);
  const isStudentRoute = STUDENT_PREFIXES.some((prefix) => nextUrl.pathname.startsWith(prefix));

  if ((isAdminRoute || isStudentRoute) && !user) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((isAdminRoute || isStudentRoute) && user) {
    // The JWT stays valid even after its User row is gone (account deleted,
    // or the database was reset) -- without this, the page would crash with
    // a raw "not found" instead of cleanly bouncing back to login.
    const stillExists = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
    if (!stillExists) {
      return NextResponse.redirect(new URL("/api/auth/invalidate", nextUrl));
    }
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
  matcher: [
    "/dashboard/:path*",
    "/courses/:path*",
    "/free-courses/:path*",
    "/analytics/:path*",
    "/profile/:path*",
    "/community/:path*",
    "/calendar/:path*",
    "/support/:path*",
    "/admin/:path*",
  ],
};
