import { NewThread } from "@/components/new-thread";
export default async function App({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  return (
    <NewThread
      key={(await searchParams).new ?? "welcome"}
      startOpen={(await searchParams).new === "1"}
    />
  );
}
