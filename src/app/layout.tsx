import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Farcaster Snapchain Suite | Zero API Keys Node & Client',
  description:
    'Complete guide and open-source suite for provisioning a standalone Farcaster Snapchain read node and client with gasless signers and client filtering.',
  keywords: ['Farcaster', 'Snapchain', 'Read Node', 'Crypto', 'Web3', 'Decentralized Social', 'Open Source'],
  authors: [{ name: 'mohammadma98' }],
  openGraph: {
    title: 'Farcaster Snapchain Suite | Zero API Keys Node & Client',
    description: 'Standalone Snapchain Read Node & Open-Source Client with 3-command quickstart.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-purple-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
