import { LocalFileStorage } from "./local-file-storage";

/**
 * Storage contract for uploaded files, scoped by workspace. The local folder
 * implementation can be replaced by S3 / R2 without touching routes.
 */
export interface FileStorage {
  save(workspaceId: string, filename: string, bytes: Buffer): Promise<void>;
  /** Returns the file bytes, or null when the file does not exist. */
  read(workspaceId: string, filename: string): Promise<Buffer | null>;
}

const globalStorage = globalThis as typeof globalThis & {
  techstylesFileStorage?: FileStorage;
};
export const fileStorage: FileStorage = (globalStorage.techstylesFileStorage ??=
  new LocalFileStorage());
