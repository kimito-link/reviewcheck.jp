import type { ReactNode } from "react";
import { Container } from "./Container";

export function Section({
  id,
  title,
  lead,
  children,
  tone = "default",
}: {
  id?: string;
  title?: string;
  lead?: string;
  children: ReactNode;
  tone?: "default" | "muted";
}) {
  return (
    <section
      id={id}
      className={`py-12 sm:py-16 ${tone === "muted" ? "bg-white" : ""}`}
    >
      <Container>
        {title ? (
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            {title}
          </h2>
        ) : null}
        {lead ? <p className="mt-2 text-slate-600">{lead}</p> : null}
        <div className={title || lead ? "mt-8" : ""}>{children}</div>
      </Container>
    </section>
  );
}
