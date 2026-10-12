import { Workspace } from "@/components/sites/techstyles/workspace-loader";
export default async function Page({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  return <Workspace path={path} />;
}
