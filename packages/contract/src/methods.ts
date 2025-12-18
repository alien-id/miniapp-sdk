import { Type } from 'typebox';

// Method definitions
export const methods = {
  get_auth_data: Type.Object({
    token: Type.String(),
  }),
};
