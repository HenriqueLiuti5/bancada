import Link from "next/link";

export function Segmentos({ children, tour }: { children: React.ReactNode; tour?: string }) {
  return (
    <nav
      data-tour={tour}
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-realce p-1"
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
          ? "shrink-0 rounded-full bg-superficie px-4 py-2 text-sm font-semibold whitespace-nowrap text-texto shadow-suave sm:py-1.5 sm:text-[13px]"
          : "shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-texto-apagado transition-colors hover:text-texto sm:py-1.5 sm:text-[13px]"
      }
    >
      {children}
    </Link>
  );
}
