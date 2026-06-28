import { ArrowDown, ShieldCheck, Sparkles } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative mx-auto flex min-h-[72vh] max-w-6xl flex-col justify-center px-4 py-16 md:px-6">
      <div className="max-w-3xl animate-fade-up">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-sm text-text-muted backdrop-blur">
          <Sparkles className="h-4 w-4 text-accent-light" />
          Free • No Upload • No Limit
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight tracking-normal text-text md:text-7xl">
          Protect Your Work. Obfuscate Your Pack.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-text-muted md:text-lg">
          100% client-side — your files never leave your browser.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#upload"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-light"
          >
            <ShieldCheck className="h-4 w-4" />
            Start Protecting
          </a>
          <a
            href="#upload"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-surface/75 px-5 text-sm font-semibold text-text transition hover:border-border-accent"
          >
            <ArrowDown className="h-4 w-4" />
            Upload ZIP
          </a>
        </div>
      </div>
    </section>
  );
}
