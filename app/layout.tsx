import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'uReport NG — City of Bloomington 311',
  description: 'Report municipal issues and track their progress',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
