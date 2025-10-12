/**
 * Silences noisy console output in production builds while keeping errors.
 * This runtime shim complements build-time stripping of debug statements.
 */
if (import.meta.env.PROD && typeof console !== 'undefined') {
  const noop = () => undefined;

  console.log = noop;
  console.debug = noop;
  console.info = noop;
}
