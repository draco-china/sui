/**
 * Escapes a series key for a CSS custom property name. Letters, digits, `_`,
 * `-` and non-ASCII characters such as Chinese stay as they are; anything
 * else becomes a CSS escape, so distinct keys never share a variable.
 */
export function chartKey(key: string) {
  return key.replace(
    /[^\w\u0080-￿-]/g,
    (char) => `\\${char.charCodeAt(0).toString(16)} `,
  );
}
