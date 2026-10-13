# Local backend

Start the app from `techstyles/`. Products, versions, library records and the brand profile persist per workspace in `data/workspace.json` (format `{version: 2, workspaces: {<id>: ...}}`; older single-workspace files are migrated on read); uploads persist per workspace in `data/uploads/<workspaceId>/` through the `FileStorage` interface in `src/lib/file-storage.ts` (files from before workspaces stay in `data/uploads/` and are readable by the default workspace only). Upload URLs keep the form `/api/uploads/<uuid>.<ext>`; the workspace comes from `currentWorkspaceId()`. When sign-in is added, supplier share pages must serve the shared product's images by share token, because suppliers have no session. `TECHSTYLES_DATA_DIR` optionally overrides this directory. Writes are serialized within the server process and committed by atomic rename. This is a single-process local store, not a multi-server database. Routes access data only through the `WorkspaceRepository` interface in `src/lib/repository.ts`, scoped by the id from `currentWorkspaceId()` (`src/lib/workspace.ts`, currently always `default`). Replace `JsonWorkspaceRepository` and `currentWorkspaceId()` to move to a database and sign-in.

The app has no authentication or user isolation. Keep the development server bound to localhost. Do not expose it publicly as a production service without implementing authentication and authorization for all editor, library, upload and AI routes. Supplier token routes are read-only, omit comments/version history/access tokens, and redact excluded sections. A token is not a substitute for protecting the other application routes. Uploaded files are accessible by their random URLs; revoking a product link does not delete or revoke already copied asset URLs.

## Optional image generation

Set `OPENAI_API_KEY` in the server environment or `.env.local`, then restart. Never use a `NEXT_PUBLIC_` key. Requests to `/api/generate` cost money on that OpenAI account. No provider calls run when the key is absent (HTTP 503), and automated tests use a mock transport.

`POST /api/generate` accepts `{prompt, kind, image?}`. Kind is `sketch`, `mockup`, `artwork` or `label`. Image is an existing local `/api/uploads/...` or `/sites/techstyles/...` PNG/JPEG/WebP URL. The response is `{url}` for the saved generated image. Without an image the server calls image generations; with a reference it calls image edits to preserve garment details. The default is `gpt-image-1.5`; `OPENAI_IMAGE_MODEL` overrides it. Requests have a 180-second timeout and bounded response size. Provider failures return an error and never a fake preview.

Implementation references: [official image generation API](https://developers.openai.com/api/reference/resources/images/methods/generate) and [official image editing API](https://developers.openai.com/api/reference/resources/images/methods/edit). Model availability depends on the configured account.

## Verification

Run `node --test scripts/backend.test.cjs`. Tests use a temporary database and mocked image transport, covering concurrent persistence, validation, upload signatures, version restore, sharing/revocation, section redaction and optional image generation. Production PDF export uses the browser print workflow in the frontend.
