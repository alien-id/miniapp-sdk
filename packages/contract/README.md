# @alien-id/contract

This package defines the communication schema used by the bridge to enable seamless interaction between the miniapp and the host app. Think of it as the shared language that both sides speak to understand each other.

## Types of Communication

The contract organizes communication into two main types:

- **Methods**: Requests sent from the miniapp to the native app (with responses)
- **Events**: Notifications sent from the native app to the miniapp (one-way)

### Methods

Methods enable two-way communication between the miniapp and the host app. When the miniapp sends a method request to the host app, it includes a `reqId` to track the request. The host app then responds with an **event** that includes the same `reqId`, allowing the miniapp to match the response to the original request. This allows the miniapp to make requests and wait for specific answers, like asking for user permissions.

### Events

Events serve two purposes in the communication protocol:

1. **Callbacks for Methods**: Events act as responses to method requests. When the miniapp sends a method request, the host app responds with an event that includes the same `reqId` to match the request. This enables the request-response pattern where the miniapp can wait for a specific response.

2. **One-way Notifications**: Events can also be standalone notifications sent from the host app to the miniapp. These are perfect for situations where the host app needs to inform the miniapp about something happening (like a network status change or a user action), but doesn't need a response back. The miniapp simply listens and reacts accordingly.

The presence of a `reqId` in the event payload indicates it's a response to a method request, while events without a `reqId` are standalone notifications.

### Versioning

The protocol uses semantic versioning to ensure robust and safe communication between the miniapp and the host app.

**Protocol Version**
Both the miniapp and host app share their current protocol version, allowing each side to understand the other's capabilities from the start.

**Method & Event Versions**
Each method and event has a minimum version requirement (the protocol version from which it's supported). The miniapp can check availability before use, detect version mismatches, and gracefully handle outdated host apps.

**Safety & UX**
The versioning system prevents errors by throwing clear notifications on mismatches, allowing the miniapp to adapt its behavior and gracefully degrade functionality when needed.
