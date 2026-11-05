type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type Depth = [never, 0, 1, 2];

/** Dot paths into a value, three levels deep: `"name" | "profile.city"`. */
export type Path<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends Primitive | Date | readonly unknown[]
    ? never
    : {
        [K in keyof T & string]: T[K] extends
          | Primitive
          | Date
          | readonly unknown[]
          ? K
          : K | `${K}.${Path<NonNullable<T[K]>, Depth[D]>}`;
      }[keyof T & string];

/** The value type at a dot path. */
export type PathValue<
  T,
  P extends string,
> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<NonNullable<T[K]>, Rest>
    : unknown
  : P extends keyof T
    ? T[P]
    : unknown;

/** Splits `items[0].name` and `profile.city` into keys. */
export function pathKeys(path: string): string[] {
  return path.split(/[.[\]]/).filter(Boolean);
}

/** Reads a dot or bracket path such as `profile.city` or `items[0].name`. */
export function getPath(source: unknown, path: string): unknown {
  let value = source;
  for (const key of pathKeys(path)) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

/** Returns a copy with the value at `path` replaced; arrays stay arrays. */
export function setPath<T>(source: T, path: string, next: unknown): T {
  const keys = pathKeys(path);
  if (keys.length === 0) return next as T;
  const [key, ...rest] = keys;
  const current = (source ?? {}) as Record<string, unknown>;
  const copy: Record<string, unknown> = Array.isArray(current)
    ? ([...current] as unknown as Record<string, unknown>)
    : { ...current };
  copy[key] = rest.length
    ? setPath(
        current[key] ?? (/^\d+$/.test(rest[0]) ? [] : {}),
        rest.join("."),
        next,
      )
    : next;
  return copy as T;
}

/** Returns a copy without the value at `path`. */
export function omitPath<T>(source: T, path: string): T {
  const keys = pathKeys(path);
  if (keys.length === 0 || source === null || typeof source !== "object")
    return source;
  const [key, ...rest] = keys;
  const current = source as Record<string, unknown>;
  if (!(key in current)) return source;
  if (rest.length === 0) {
    if (Array.isArray(current)) return source;
    const { [key]: _removed, ...others } = current;
    return others as T;
  }
  const copy: Record<string, unknown> = Array.isArray(current)
    ? ([...current] as unknown as Record<string, unknown>)
    : { ...current };
  copy[key] = omitPath(current[key], rest.join("."));
  return copy as T;
}

/** True when `path` is `prefix` or lies inside it. */
export function isPathWithin(path: string, prefix: string) {
  const keys = pathKeys(path);
  const prefixKeys = pathKeys(prefix);
  return prefixKeys.every((key, index) => keys[index] === key);
}

/** A new object with only these paths of `source`; missing ones are left out. */
export function pickPaths<T extends object>(
  source: unknown,
  names: readonly string[],
): T {
  let result = {} as T;
  for (const name of names) {
    const value = getPath(source, name);
    if (value !== undefined) result = setPath(result, name, value);
  }
  return result;
}
