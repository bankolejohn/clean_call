export function About() {
  return (
    <section className="w-full px-4 py-16 sm:px-6 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
          About CleanCall
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          CleanCall is a waste management platform designed for Ekiti State,
          Nigeria. We are building a database of demand and supply to connect
          those who need waste collection with those who provide it.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          By registering, you help us understand the waste management needs of
          our communities and match them with capable service providers. Together,
          we can create a cleaner and more sustainable environment across all 16
          Local Government Areas of Ekiti State.
        </p>
      </div>
    </section>
  );
}
