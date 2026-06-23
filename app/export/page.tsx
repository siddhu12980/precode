import { ExportSession } from "./export-session";

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string | string[] }>;
}) {
  const params = await searchParams;
  const demoMode = Array.isArray(params.demo) ? params.demo[0] === "1" : params.demo === "1";

  return <ExportSession demoMode={demoMode} />;
}
