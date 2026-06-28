// Empty stub for Next.js's `server-only` marker package. It has no resolution
// in vitest's node environment, so vitest.config.ts aliases `server-only` here
// to let server modules import cleanly in unit tests. The import is a build-time
// guard with no runtime behavior, so an empty module is the correct no-op.
export {};
