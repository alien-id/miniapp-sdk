import type { WithReqId } from '../../utils';

export interface Events {
  'auth::init::token': WithReqId<{
    token: string;
  }>;
}
