import { Hero } from "@/components/landing/hero";
import { About } from "@/components/landing/about";
import { Reasons } from "@/components/landing/reasons";
import { CTASection } from "@/components/landing/cta-section";
import { Contact } from "@/components/landing/contact";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <Hero />
        <About />
        <Reasons />
        <CTASection />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
