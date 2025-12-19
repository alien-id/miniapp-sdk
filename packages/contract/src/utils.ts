/**
 * Adds a reqId field to the payload.
 */
export type WithReqId<T> = T & {
  reqId: string;
};

/**
 * Semantic versioning type.
 * @example
 * type Version = '1.0.0';
 */
export type Version = `${number}.${number}.${number}`;

/**
 * Extracts keys, that are present in the type if it is an object.
 * @example
 * type Keys = UnionKeys<{ a: string, b: number }>;
 * // Keys = 'a' | 'b'
 */
export type UnionKeys<T> = T extends T ? keyof T : never;

/**
 * Checks if a type is never.
 * @example
 * type IsNever = IsNever<never>;
 * // IsNever = true
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Conditional type.
 * @example
 * type If = If<true, 'true', 'false'>;
 * // If = 'true'
 */
export type If<Cond extends boolean, True, False> = Cond extends true
  ? True
  : False;

/**
 * Logical OR type.
 * @example
 * type Or = Or<true, false>;
 * // Or = true
 */
export type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true
    ? true
    : false;
