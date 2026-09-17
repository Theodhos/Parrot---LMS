import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's generated client (src/generated/prisma, per prisma/schema.prisma's
  // custom `output`) locates its query-engine binary with a `process.cwd()`-
  // relative dynamic path. Next.js's file tracer can't statically resolve
  // that, so without this it falls back to bundling the ENTIRE project into
  // every server function/route that touches Prisma (build warning:
  // "Dynamic filesystem access causes tracing of the whole project").
  // Explicitly including just the generated client directory fixes it.
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
