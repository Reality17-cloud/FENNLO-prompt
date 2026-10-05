import { notFound } from "next/navigation";
import { pageAccount } from "@/lib/auth";
import { database } from "@/lib/db";
import { ThreadService } from "@/lib/threads";
import { AppError } from "@/lib/errors";
import { ThreadWorkspace } from "@/components/thread-workspace";
export default async function Thread({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const user = await pageAccount();
  const { threadId } = await params;
  let detail;
  try {
    detail = await new ThreadService(database()).detail(user.id, threadId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  return <ThreadWorkspace key={threadId} initial={detail} />;
}
