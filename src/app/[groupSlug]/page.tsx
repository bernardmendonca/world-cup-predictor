import { redirect } from "next/navigation";

export default async function GroupDashboard({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  redirect(`/${groupSlug}/predict`);
}
