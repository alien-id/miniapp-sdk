# @alm/bridge

This package provides a lightweight, type-safe interface for sending method requests, listening for method responses, and subscribing to events between the miniapp and the native host app.

## How It Works

The bridge handles the communication mechanics: tracking request IDs, matching responses, and managing event subscriptions. It uses `@alm/protocol` for type definitions and automatically builds, parses, and validates JSON schemas for all messages.

As a TypeScript-only package, the bridge provides compile-time type safety and complements the features supported on host platforms, creating a robust communication layer between miniapp and host app.
