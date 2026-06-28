'use client';

import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/HeroSection';
import { OptionsPanel } from '@/components/OptionsPanel';
import { ProcessingModal } from '@/components/ProcessingModal';
import { ResultCard } from '@/components/ResultCard';
import { UploadZone } from '@/components/UploadZone';

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-text">
      <div className="grid-field fixed inset-0 -z-10 animate-grid-flow opacity-90" />
      <HeroSection />
      <section id="upload" className="mx-auto grid w-full max-w-6xl gap-5 px-4 pb-16 md:grid-cols-[1.15fr_0.85fr] md:px-6">
        <UploadZone />
        <OptionsPanel />
      </section>
      <ResultCard />
      <Footer />
      <ProcessingModal />
    </main>
  );
}
