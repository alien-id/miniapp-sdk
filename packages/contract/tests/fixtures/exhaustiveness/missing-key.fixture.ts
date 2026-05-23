// Negative control. This fixture must FAIL to compile under
// `tsc --noEmit --strict`.
//
// Scenario: a contributor adds a new method (`'future:method'`) to the
// `Methods` interface but forgets to update the response-event map. With
// the original `extends Record<MethodName, EventName | never>` base, the
// resulting type silently classified the new method as
// `EventName | never = EventName`, hiding the omission and defaulting the
// method to "request-response".
//
// We simulate that contributor mistake by augmenting `Methods` with a new
// key. After the fix, the `MethodResponseEvents` source uses an exhaustive
// `satisfies { [M in MethodName]: ... }` constraint, so the augmentation
// causes the source file itself to fail type-checking. Bringing
// `MethodResponseEvents` into the fixture's program is enough to surface
// that error during `tsc`.

import type { MethodResponseEvents } from '../../../src/methods/types/response-event';

declare module '../../../src/methods/definitions/methods' {
  interface Methods {
    'future:method': { payload: never; versionedPayload: never };
  }
}

// The reference below forces tsc to type-check the augmented program.
// In the buggy world, `MethodResponseEvents` silently accepts the new
// method via its `Record<MethodName, EventName | never>` base and this
// fixture compiles. In the fixed world, the source's exhaustiveness
// constraint rejects the incomplete map and the fixture fails to compile.
export type _Touch = MethodResponseEvents;
