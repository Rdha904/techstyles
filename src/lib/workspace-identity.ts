import type { BrandProfile } from "./brand-types";

export type WorkspaceIdentity = {
  name: string;
  initials: string;
};

export function workspaceIdentity(
  profile: BrandProfile | null,
): WorkspaceIdentity {
  const name = profile?.name.trim() || "My workspace";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return { name, initials };
}
