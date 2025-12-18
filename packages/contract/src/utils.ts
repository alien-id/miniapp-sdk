import { type TObject, type TProperties, Type } from 'typebox';

/**
 * Merges a TypeBox schema with an optional request ID field.
 * Returns a merged object schema with optional req_id and all properties from the payload schema.
 * The generic type T is preserved in the return type for better type inference.
 */
export const withReqId = <T extends TObject<TProperties>>(payload: T) => {
  return Type.Intersect([
    Type.Object({
      req_id: Type.Optional(Type.String()),
    }),
    payload,
  ]);
};
