import type { CreateMethodPayload } from '../types/payload';

export interface Methods {
  'auth::init::request': CreateMethodPayload<{
    appId: string;
    challenge: string;
  }>;
}
