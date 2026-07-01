import { getText, setText } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return Response.json({ text: await getText(slug) });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await req.json().catch(() => ({}))) as { text?: string };
  await setText(slug, body.text ?? '');
  return Response.json({ ok: true });
}
