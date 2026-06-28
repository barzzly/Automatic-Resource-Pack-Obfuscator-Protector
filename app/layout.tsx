import type { Metadata } from 'next';
import './globals.css';


export const metadata: Metadata = {
  title: 'Automatic Resource Pack Obfuscator & Protector',
  description: 'Client-side Minecraft resource pack protector by BarzzLy.',
  icons: { icon: '/BarzzLy.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
