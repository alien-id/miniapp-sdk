# @alm/protocol

This package defines the communication protocol used by the bridge to enable seamless interaction between the miniapp and the native app. Think of it as the shared language that both sides speak to understand each other.

## Types of Communication

The protocol organizes communication into two main types:

- **Methods**: Requests sent from the miniapp to the native app (with responses)
- **Events**: Notifications sent from the native app to the miniapp (one-way)

### Methods

Methods are a special subset of events that enable two-way communication. When the miniapp sends a method to the native app, it includes a `req_id` to track the request and match it with the corresponding response. This allows the miniapp to make requests and wait for specific answers, like asking for user permissions or requesting device information.

### Events

Events are one-way notifications sent from the native app to the miniapp. These are perfect for situations where the native app needs to inform the miniapp about something happening (like a network status change or a user action), but doesn't need a response back. The miniapp simply listens and reacts accordingly.

### Versioning

The protocol uses semantic versioning to ensure robust and safe communication between the miniapp and the host app.

**Protocol Version**
Both the miniapp and host app share their current protocol version, allowing each side to understand the other's capabilities from the start.

**Method & Event Versions**
Each method and event has a minimum version requirement (the protocol version from which it's supported). The miniapp can check availability before use, detect version mismatches, and gracefully handle outdated host apps.

**Safety & UX**
The versioning system prevents errors by throwing clear notifications on mismatches, allowing the miniapp to adapt its behavior and gracefully degrade functionality when needed.
