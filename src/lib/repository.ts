import type { Product } from "./types";
import type { WorkspaceData } from "./store";
import { JsonWorkspaceRepository } from "./json-repository";

/**
 * Storage contract for all workspace data. Routes depend only on this
 * interface, so the JSON file implementation can be replaced by a database
 * without touching them.
 */
export interface WorkspaceRepository {
  /** Reads the current state of one workspace. */
  read(workspaceId: string): Promise<WorkspaceData>;
  /** Runs `operation` against one workspace and persists the result atomically. */
  update<T>(
    workspaceId: string,
    operation: (data: WorkspaceData) => T | Promise<T>,
  ): Promise<T>;
  /** Looks up a product by its public supplier share token across workspaces. */
  findProductByShareToken(token: string): Promise<Product | null>;
}

const globalRepository = globalThis as typeof globalThis & {
  techstylesRepository?: WorkspaceRepository;
};
export const repository: WorkspaceRepository =
  (globalRepository.techstylesRepository ??= new JsonWorkspaceRepository());
