import { TitleManager } from "@/components/title-manager";

export default function ShowsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  return <TitleManager type="show" searchParams={searchParams} />;
}
