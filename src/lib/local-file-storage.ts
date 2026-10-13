import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError, dataDirectory } from "./store";
import { DEFAULT_WORKSPACE_ID } from "./workspace";
import type { FileStorage } from "./file-storage";

const root = path.join(dataDirectory, "uploads");
const safeName = /^[0-9a-f-]{36}\.(png|jpg|webp|pdf)$/;
const safeWorkspace = /^[A-Za-z0-9_-]{1,64}$/;

function check(workspaceId: string, filename: string) {
  if (!safeWorkspace.test(workspaceId) || !safeName.test(filename))
    throw new ApiError("Invalid file path.", 400);
}

/**
 * Stores files in `data/uploads/<workspaceId>/`. Files written before
 * workspaces existed sit directly in `data/uploads/` and stay readable by the
 * default workspace only.
 */
export class LocalFileStorage implements FileStorage {
  async save(workspaceId: string, filename: string, bytes: Buffer) {
    check(workspaceId, filename);
    const directory = path.join(root, workspaceId);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), bytes, { mode: 0o600 });
  }
  async read(workspaceId: string, filename: string) {
    check(workspaceId, filename);
    const candidates = [path.join(root, workspaceId, filename)];
    if (workspaceId === DEFAULT_WORKSPACE_ID)
      candidates.push(path.join(root, filename));
    for (const file of candidates) {
      try {
        return await readFile(file);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    return null;
  }
}
