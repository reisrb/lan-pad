import { Pad } from '@/components/Pad';

export default async function PadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <Pad slug={slug} />;
}
