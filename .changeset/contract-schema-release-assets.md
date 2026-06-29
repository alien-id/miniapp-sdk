---
"@alien-id/miniapps-contract": patch
---

Re-cut the contract package so its generated JSON schemas (`events.schema.json`, `methods.schema.json`) are published as GitHub release assets via the updated release pipeline. No API or schema content changes — the schemas already ship inside the npm tarball; this validates the asset-upload step and restores convenient direct download from the release.
