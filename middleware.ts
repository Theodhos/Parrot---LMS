import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

// Coarse, route-level gate only. Every domain action/API handler re-checks
// authentication and role/ownership server-side — this just avoids flashing
// protected pages to signed-out visitors or the wrong role.
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

export const config = {
  matcher: ["/dashboard/:path*", "/learn/:path*", "/analytics/:path*", "/profile/:path*", "/admin/:path*"],
};
