import { PRICING, PRICING_NOTE } from "@reviewcheck/config";

export function PricingSection() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRICING.map((p) => (
          <div
            key={p.key}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
            <p className="mt-2 text-2xl font-extrabold text-blue-700">
              {p.price}
              {p.priceNote ? (
                <span className="ml-1 text-xs font-medium text-slate-500">
                  {p.priceNote}
                </span>
              ) : null}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {p.description}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">{PRICING_NOTE}</p>
    </div>
  );
}
