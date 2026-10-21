import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Farcaster Client | Sovereign Read Node & Web Suite',
  description:
    'Sovereign Farcaster web client connecting directly to standalone Snapchain read nodes with gasless app keys and protocol curation.',
  keywords: ['Farcaster', 'Snapchain', 'Read Node', 'Crypto', 'Web3', 'Decentralized Social', 'Open Source'],
  authors: [{ name: 'mohammadma98' }],
  openGraph: {
    title: 'Farcaster Client | Sovereign Read Node & Web Suite',
    description: 'Sovereign Snapchain Read Node & Open-Source Client with 3-command quickstart.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="antialiased selection:bg-purple-600 selection:text-white bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
