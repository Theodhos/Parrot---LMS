// Stub for the `server-only` package in the test environment. `server-only`
// intentionally throws outside Next.js's server bundling graph; Vitest runs
// plain Node, so we alias it to a no-op (see vitest.config.ts).
export {};
