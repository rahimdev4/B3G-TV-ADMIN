import { notFound } from "next/navigation";

const sections: Record<string, { title: string; description: string }> = {
  categories: { title: "Categories", description: "Organize movies and shows into browsable collections." },
  media: { title: "Media library", description: "Manage Cloudflare thumbnails and video assets." },
  movies: { title: "Movies", description: "Manage standalone films without changing existing playback records." },
  shows: { title: "Shows", description: "Review and manage B3GTV shows." },
  episodes: { title: "Seasons & Episodes", description: "Structure episodic content and its playback order." },
  trailers: { title: "Trailers", description: "Attach and preview promotional video assets." },
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const content = sections[section];
  if (!content) notFound();
  return <><section className="page-heading"><div><p className="eyebrow accent">CONTENT</p><h1>{content.title}</h1><p className="muted">{content.description}</p></div><button className="button primary" disabled>Add new</button></section><div className="empty-state"><div className="empty-icon">+</div><h2>{content.title} foundation is ready</h2><p className="muted">Editing stays disabled until the additive database migration is reviewed and approved.</p></div></>;
}
