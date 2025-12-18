/**
 * Internal contract definitions using TypeBox for schema generation.
 * This file is only used by build scripts, not exported from the package.
 */

import { events } from './events';
import { methods } from './methods';

// Contract structure for schema generation
export const contract = {
  events,
  methods,
};
