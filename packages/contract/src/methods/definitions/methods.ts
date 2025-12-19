import type { CreateMethodPayload } from '../types/payload';

export interface Methods {
  'auth.init.request': CreateMethodPayload<{
    appId: string;
    challenge: string;
  }>;
  'touch.start': CreateMethodPayload<
    {
      touchId: string;
      x: number;
      y: number;
    },
    'x' | 'y'
  >;
}
