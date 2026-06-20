export function Contact() {
  return (
    <section className="w-full bg-secondary px-4 py-16 sm:px-6 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
          Contact Us
        </h2>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Have questions? Reach out to us.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
          <a
            href="tel:+2348001234567"
            className="inline-flex items-center gap-2 text-base font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">📞</span>
            +234 800 123 4567
          </a>
          <a
            href="mailto:hello@cleancall.ng"
            className="inline-flex items-center gap-2 text-base font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">✉️</span>
            hello@cleancall.ng
          </a>
        </div>
      </div>
    </section>
  );
}
