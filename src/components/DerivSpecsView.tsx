import React, { useState } from "react";
import { Search } from "lucide-react";
import { DERIV_INDICES_SPECS, DerivIndexSpec } from "../data/derivIndices";

export const DerivSpecsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filteredSpecs = DERIV_INDICES_SPECS.filter((spec) => {
    const matchesCategory =
      categoryFilter === "ALL" || spec.category === categoryFilter;
    const matchesSearch =
      spec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spec.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spec.smcBehavior.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ["ALL", "Volatility", "Boom & Crash", "Step & Jump"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
            Référentiel Institutionnel des Indices Synthétiques Deriv
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Tailles de lots minimums MT5, comportement algorithmique SMC/ICT et règles de gestion du risque par actif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Interactive Segmented Category Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#1E293B] border border-slate-800 rounded-lg">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? "bg-[#0F172A] text-slate-100 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {cat === "ALL" ? "Tous les actifs" : cat}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher V75, Boom 1000..."
              className="bg-[#1E293B] border border-slate-800 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-56"
            />
          </div>
        </div>
      </div>

      {/* High-Density Specification Table */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0F172A]/60 text-xs font-medium text-slate-400">
                <th className="py-3 px-4">Actif Synthétique</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4 text-right">Lot Minimum (MT5)</th>
                <th className="py-3 px-4 text-right">Lot Max</th>
                <th className="py-3 px-4">Structure SMC / ICT & Spécificité</th>
                <th className="py-3 px-4">Règle Money Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {filteredSpecs.map((spec: DerivIndexSpec) => (
                <tr
                  key={spec.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-100 whitespace-nowrap">
                    {spec.name}
                    <div className="text-[11px] font-mono text-slate-400 font-normal mt-0.5">
                      Symbole MT5 : {spec.symbol}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    {spec.category}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-400 whitespace-nowrap">
                    {spec.minLotDisplay}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                    {spec.maxLot.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-md leading-relaxed">
                    {spec.smcBehavior}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-sm leading-relaxed">
                    {spec.riskAdvisory}
                  </td>
                </tr>
              ))}
              {filteredSpecs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-sm text-slate-400"
                  >
                    Aucun indice synthétique ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
