# Manifest Documentation

To launch your application within the Alien ecosystem, every Mini App requires a dedicated `manifest.json` file. It acts as your app's digital passport, ensuring it is recognized and trusted by Alien clients.

## Configuration Overview

The manifest uses a standard JSON format to communicate metadata to the host environment.

```json
{
  "name": "Alien Swap",
  "description": "Swap tokens ",
  "version": "1.0",
  "icon": "https://alien.org/icon.png",
  "domain": "swap.alien.org",
  "metatags": ["web3", "utility"],
  "scope": ["public.name", "public.avatar"]
}
```

---

## Schema

| Field         | Type   | Required | Description                                                    |
| ------------- | ------ | -------- | -------------------------------------------------------------- |
| `name`        | String | Yes      | The display name of the mini-app.                              |
| `description` | String | Yes      | A short summary of the app's functionality.                    |
| `version`     | String | Yes      | The current semantic version of the manifest.                  |
| `icon`        | URL    | Yes      | A direct link to a PNG/SVG icon (recommended size: 512x512px). |
| `domain`      | String | Yes      | Must match the exact URL where the mini app is hosted.         |
| `metatags`    | Array  | No       | Keywords used for categorization and searchability.            |
| `scope`       | Array  | No       | Permissions requested from the user (e.g., identity data).     |

---

## Key Implementation Rules

### 1. Domain Validation

The `domain` field is used for origin verification. If the `domain` in the manifest does not match the Mini App URL, the environment willfail to verify the app's authenticity and block execution.

- Correct: `swap.alien.org`
- Incorrect: `alien.org` (too broad) or `dev.swap.alien.org` (subdomain mismatch)

### 2. Optional Metatags

The `metatags` field is optional. If included, it helps the discovery engine filter your app under specific categories like `web3`, `utility` or `games`.

### 3. Scopes & Permissions

The `scope` array defines what user data your application can access.

- `public.name`: Access to the user's display name.
- `public.avatar`: Access to the user's profile picture URL.

---

> Note: Ensure your icon URL is served over HTTPS to avoid mixed-content security warnings in the browser.

## Location

For your mini app to be discoverable, you must host your manifest at this public endpoint:
`https://your-miniapp-domain.com/.well-known/manifest.json`
