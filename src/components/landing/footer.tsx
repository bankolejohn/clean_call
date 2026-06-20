export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-base font-medium text-foreground">CleanCall</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Building a cleaner Ekiti State, one registration at a time.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          &copy; {currentYear} CleanCall. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
