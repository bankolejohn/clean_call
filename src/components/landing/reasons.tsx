const reasons = [
  {
    title: "For Customers",
    items: [
      "Get connected to reliable waste collectors near you",
      "Choose a collection schedule that fits your needs",
      "Help improve sanitation in your community",
    ],
  },
  {
    title: "For Collectors",
    items: [
      "Reach new customers across Ekiti State",
      "Grow your waste collection business",
      "Be part of the solution for better waste management",
    ],
  },
];

export function Reasons() {
  return (
    <section className="w-full bg-secondary px-4 py-16 sm:px-6 md:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          Why Join CleanCall?
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {reasons.map((group) => (
            <div key={group.title} className="rounded-lg bg-background p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">
                {group.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-base text-muted-foreground"
                  >
                    <span
                      className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
