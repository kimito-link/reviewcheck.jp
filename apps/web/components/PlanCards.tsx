import { PLANS, PLANS_NOTE } from "@reviewcheck/config";
import { PlanCheckoutButton } from "./PlanCheckoutButton";

/** 総合改善パッケージの料金プラン（Light / Standard / Pro）。 */
export function PlanCards() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const featured = plan.featured;
          return (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl bg-white p-6 ${
                featured
                  ? "border-2 border-amber-400 shadow-xl lg:scale-[1.03]"
                  : "border border-slate-200 shadow-sm"
              }`}
            >
              {plan.ribbon ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500 px-4 py-1 text-xs font-bold text-white shadow">
                  ★ {plan.ribbon}
                </span>
              ) : null}

              <h3 className="text-xl font-extrabold text-slate-900">
                {plan.name}
              </h3>
              <p className="mt-1 min-h-[2.5rem] text-sm text-slate-600">
                {plan.audience}
              </p>

              <div className="mt-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {plan.price}
                </span>
                {plan.priceUnit ? (
                  <span className="ml-0.5 text-base font-bold text-slate-900">
                    {plan.priceUnit}
                  </span>
                ) : null}
                {plan.per ? (
                  <span className="ml-1 text-sm font-medium text-slate-500">
                    {plan.per}
                  </span>
                ) : null}
                {plan.priceNote ? (
                  <span className="mt-0.5 block text-xs text-slate-500">
                    （{plan.priceNote}）
                  </span>
                ) : null}
              </div>

              <div className="my-5 h-px bg-slate-100" />

              <ul className="flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li
                    key={f.text}
                    className={`flex items-start gap-2 text-sm leading-relaxed ${
                      f.head ? "font-bold text-slate-900" : "text-slate-600"
                    }`}
                  >
                    <span
                      className={`mt-0.5 shrink-0 font-extrabold ${
                        f.head ? "text-blue-600" : "text-emerald-600"
                      }`}
                      aria-hidden
                    >
                      {f.head ? "＋" : "✓"}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col">
                <PlanCheckoutButton
                  planKey={plan.key}
                  topic={plan.topic}
                  purchasable={Boolean(plan.checkout)}
                  featured={featured}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-slate-500">{PLANS_NOTE}</p>
    </div>
  );
}
