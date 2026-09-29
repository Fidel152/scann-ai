import React, { useState, useEffect } from "react";
import { Calculator, ShieldAlert, ArrowUpRight, ArrowDownRight, CheckCircle2 } from "lucide-react";
import { DERIV_INDICES_SPECS, ChartAnalysisResult } from "../data/derivIndices";

interface PositionCalculatorViewProps {
  activeAnalysis: ChartAnalysisResult | null;
}

export const PositionCalculatorView: React.FC<PositionCalculatorViewProps> = ({
  activeAnalysis,
}) => {
  const [selectedIndexId, setSelectedIndexId] = useState<string>("v75");
  const [accountBalance, setAccountBalance] = useState<number>(500);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [entryPrice, setEntryPrice] = useState<number>(425120.5);
  const [stopLoss, setStopLoss] = useState<number>(421800.0);
  const [takeProfit1, setTakeProfit1] = useState<number>(430500.0);
  const [takeProfit2, setTakeProfit2] = useState<number>(436900.0);

  // Sync with active analysis when user switches or loads a setup
  useEffect(() => {
    if (!activeAnalysis) return;
    const e = parseFloat(activeAnalysis.entryPrice.replace(/[^0-9.]/g, ""));
    const s = parseFloat(activeAnalysis.stopLoss.replace(/[^0-9.]/g, ""));
    const t1 = parseFloat(activeAnalysis.takeProfit1.replace(/[^0-9.]/g, ""));
    const t2 = parseFloat(activeAnalysis.takeProfit2.replace(/[^0-9.]/g, ""));

    if (!isNaN(e) && e > 0) setEntryPrice(e);
    if (!isNaN(s) && s > 0) setStopLoss(s);
    if (!isNaN(t1) && t1 > 0) setTakeProfit1(t1);
    if (!isNaN(t2) && t2 > 0) setTakeProfit2(t2);
    setDirection(activeAnalysis.action);

    const assetLower = activeAnalysis.asset.toLowerCase();
    if (assetLower.includes("75")) setSelectedIndexId("v75");
    else if (assetLower.includes("50") && !assetLower.includes("500") && !assetLower.includes("150") && !assetLower.includes("250")) setSelectedIndexId("v50");
    else if (assetLower.includes("100") && !assetLower.includes("1000")) setSelectedIndexId("v100");
    else if (assetLower.includes("boom 1000") || assetLower.includes("boom1000")) setSelectedIndexId("boom1000");
    else if (assetLower.includes("crash 1000") || assetLower.includes("crash1000")) setSelectedIndexId("crash1000");
    else if (assetLower.includes("step")) setSelectedIndexId("step100");
  }, [activeAnalysis]);

  const currentSpec =
    DERIV_INDICES_SPECS.find((s) => s.id === selectedIndexId) ||
    DERIV_INDICES_SPECS[0];

  const handleSelectSpec = (id: string) => {
    setSelectedIndexId(id);
    const spec = DERIV_INDICES_SPECS.find((s) => s.id === id);
    if (spec) {
      const base = spec.typicalPrice;
      const dist = spec.typicalSLPoints;
      setEntryPrice(base);
      if (direction === "BUY") {
        setStopLoss(Number((base - dist).toFixed(2)));
        setTakeProfit1(Number((base + dist * 1.8).toFixed(2)));
        setTakeProfit2(Number((base + dist * 3.2).toFixed(2)));
      } else {
        setStopLoss(Number((base + dist).toFixed(2)));
        setTakeProfit1(Number((base - dist * 1.8).toFixed(2)));
        setTakeProfit2(Number((base - dist * 3.2).toFixed(2)));
      }
    }
  };

  const slDistancePoints = Math.max(Math.abs(entryPrice - stopLoss), 0.0001);
  const tp1DistancePoints = Math.abs(takeProfit1 - entryPrice);
  const tp2DistancePoints = Math.abs(takeProfit2 - entryPrice);

  const rrTP1 = (tp1DistancePoints / slDistancePoints).toFixed(2);
  const rrTP2 = (tp2DistancePoints / slDistancePoints).toFixed(2);

  const targetRiskUSD = (accountBalance * riskPercent) / 100;
  const rawIdealLot =
    targetRiskUSD / (slDistancePoints * currentSpec.pointValuePerLot);

  // Enforce Deriv minimum lot constraint
  const effectiveLot = Math.max(
    currentSpec.minLotStandard,
    Number(rawIdealLot.toFixed(4))
  );

  const actualRiskUSD =
    effectiveLot * slDistancePoints * currentSpec.pointValuePerLot;
  const rewardTP1USD =
    effectiveLot * tp1DistancePoints * currentSpec.pointValuePerLot;
  const rewardTP2USD =
    effectiveLot * tp2DistancePoints * currentSpec.pointValuePerLot;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
            Calculateur de Lots & Gestion du Risque Deriv (MT5)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Calibrage institutionnel des tailles de lots minimums (V75, V50, V100, Boom/Crash) et calcul automatique du Break-Even (BE).
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Indice actif : {currentSpec.name}</span>
          <span aria-hidden="true">·</span>
          <span>Lot min : {currentSpec.minLotDisplay}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Parameters */}
        <div className="lg:col-span-7 bg-[#1E293B] border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Indice Synthétique Deriv
              </label>
              <select
                value={selectedIndexId}
                onChange={(e) => handleSelectSpec(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {DERIV_INDICES_SPECS.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name} (Min: {spec.minLotDisplay})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Direction du Setup
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#0F172A] border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDirection("BUY")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    direction === "BUY"
                      ? "bg-[#16A34A] text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  BUY (Achat)
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("SELL")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    direction === "SELL"
                      ? "bg-[#DC2626] text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  SELL (Vente)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Capital du Compte (USD $)
              </label>
              <input
                type="number"
                min={10}
                step={10}
                value={accountBalance}
                onChange={(e) => setAccountBalance(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Risque Max par Trade (%)
              </label>
              <input
                type="number"
                min={0.1}
                max={10}
                step={0.25}
                value={riskPercent}
                onChange={(e) => setRiskPercent(Math.max(0.1, Number(e.target.value)))}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Point d'Entrée (ENTRY)
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value))}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-red-400 mb-1.5">
                Stop Loss (SL — Rouge)
              </label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
                className="w-full bg-[#0F172A] border border-red-500/40 rounded-lg px-3.5 py-2 text-sm font-mono tabular-nums text-red-300 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-400 mb-1.5">
                Take Profit 1 (TP1 — Sécurisation BE)
              </label>
              <input
                type="number"
                step="any"
                value={takeProfit1}
                onChange={(e) => setTakeProfit1(Number(e.target.value))}
                className="w-full bg-[#0F172A] border border-emerald-500/40 rounded-lg px-3.5 py-2 text-sm font-mono tabular-nums text-emerald-300 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-400 mb-1.5">
                Take Profit 2 (TP2 — Liquidité Majeure)
              </label>
              <input
                type="number"
                step="any"
                value={takeProfit2}
                onChange={(e) => setTakeProfit2(Number(e.target.value))}
                className="w-full bg-[#0F172A] border border-emerald-500/40 rounded-lg px-3.5 py-2 text-sm font-mono tabular-nums text-emerald-300 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Right column: Computed Output */}
        <div className="lg:col-span-5 bg-[#1E293B] border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs text-slate-400">
                  Taille de Lot Recommandée
                </span>
                <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-400 mt-0.5">
                  {effectiveLot} Lot
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Ratio R:R (TP2)</span>
                <div className="text-xl font-semibold font-mono tabular-nums text-slate-100 mt-0.5">
                  1:{rrTP2}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Lot Minimum Réglementaire</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {currentSpec.minLotDisplay}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Distance Stop Loss (Points)</span>
                <span className="font-mono tabular-nums text-red-400">
                  -{slDistancePoints.toFixed(2)} pts
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Risque Monétaire au SL (Rouge)</span>
                <span className="font-mono tabular-nums font-semibold text-red-400">
                  -${actualRiskUSD.toFixed(2)} USD
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Gain Estimé au TP1 (1:{rrTP1})</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-400">
                  +${rewardTP1USD.toFixed(2)} USD
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Gain Estimé au TP2 (1:{rrTP2})</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-400">
                  +${rewardTP2USD.toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                <span className="font-semibold text-slate-100">Protocole Break-Even (BE) :</span>{" "}
                Dès que le prix atteint{" "}
                <span className="font-mono text-emerald-400">{takeProfit1}</span> (TP1),
                clôturez 50% de la position et déplacez le Stop Loss exactement à{" "}
                <span className="font-mono text-sky-400">{entryPrice}</span>.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-slate-400">{currentSpec.riskAdvisory}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
