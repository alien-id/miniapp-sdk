import { Type } from 'typebox';
import { withReqId } from './utils';

// Event definitions
export const events = {
  auth_data: withReqId(
    Type.Object({
      token: Type.String(),
    }),
  ),
  pong: withReqId(Type.Object({})),
};
