"use client";
import dynamic from "next/dynamic";
// The workspace is populated from local APIs after mount; it has no server data to hydrate.
const ClientWorkspace = dynamic(
  () => import("./workspace").then((module) => module.Workspace),
  { ssr: false },
);
export function Workspace({ path }: { path: string[] }) {
  return <ClientWorkspace path={path} />;
}
