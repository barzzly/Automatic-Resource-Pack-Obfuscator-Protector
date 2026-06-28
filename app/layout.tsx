import type { Metadata } from 'next';
import './globals.css';


export const metadata: Metadata = {
  title: 'Automatic Resource Pack Obfuscator & Protector',
  description: 'Protect Minecraft resource packs with client-side ZIP obfuscation.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
