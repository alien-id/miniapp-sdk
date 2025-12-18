import { Type } from 'typebox';

// Event definitions
export const events = {
  auth_data: Type.Object({
    token: Type.String(),
  }),
};
