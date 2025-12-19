import { Type } from 'typebox';
import { withReqId } from './utils';

// Method definitions
export const methods = {
  get_auth_data: withReqId(
    Type.Object({
      token: Type.String(),
    }),
  ),
  ping: withReqId(Type.Object({})),
};
