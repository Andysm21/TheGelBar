/**
 * Read a secret from the environment, forgiving the two paste mistakes that
 * can't be seen in a dashboard: a trailing line break and surrounding quotes.
 *
 * A pasted Google client ID ending in a newline reached Google as
 * "...apps.googleusercontent.com%0A" and was rejected as an unknown client.
 * Only the ends are cleaned; anything inside the value is left alone
 * (a Gmail app password is legitimately shown with spaces in it).
 */
export function cleanEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const value = raw.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
  return value === '' ? undefined : value;
}
