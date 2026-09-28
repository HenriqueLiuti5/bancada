import Link from "next/link";

export function Segmentos({ children, tour }: { children: React.ReactNode; tour?: string }) {
  return (
    <nav
      data-tour={tour}
      className="inline-flex max-w-full overflow-x-auto rounded-lg border border-borda bg-realce p-0.5"
    >
      {children}
    </nav>
  );
}

export function Segmento({
  href,
  ativo,
  children,
}: {
  href: string;
  ativo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={
        ativo
          ? "shrink-0 rounded-md bg-superficie px-3 py-1 text-[13px] font-medium whitespace-nowrap text-texto shadow-sutil"
          : "shrink-0 rounded-md px-3 py-1 text-[13px] whitespace-nowrap text-texto-suave transition-colors hover:text-texto"
      }
    >
      {children}
    </Link>
  );
}
