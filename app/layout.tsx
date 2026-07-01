import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'lan-pad',
  description: 'Shared realtime text pad over your LAN',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
