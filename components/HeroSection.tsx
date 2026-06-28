import Image from 'next/image';
import { ShieldCheck, Zap } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative mx-auto flex min-h-[58vh] max-w-5xl flex-col items-center justify-center px-4 py-14 text-center md:px-6">
      <Image src="/BarzzLy-Black-NoBackround.png" alt="BarzzLy" width={170} height={170} priority className="mb-5 h-28 w-auto object-contain md:h-36" />
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface/75 px-3 py-1 text-sm text-text-muted backdrop-blur">
        <Zap className="h-4 w-4 text-accent-light" />
        Browser only. No upload. One click.
      </div>
      <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-normal text-text md:text-6xl">
        BarzzLy Pack Protector
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-text-muted md:text-lg">
        Drop resource pack, get protected output. Texture names randomized, JSON references fixed, Minecraft compatibility first.
      </p>
      <a href="#upload" className="mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-light">
        <ShieldCheck className="h-4 w-4" />
        Protect Pack
      </a>
    </section>
  );
}