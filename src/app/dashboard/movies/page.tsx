import { TitleManager } from "@/components/title-manager";

export default function MoviesPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  return <TitleManager type="movie" searchParams={searchParams} />;
}
