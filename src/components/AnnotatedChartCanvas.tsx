import React, { useState, useEffect, useRef } from "react";
import { Download, Eye, EyeOff, RotateCcw, Layers } from "lucide-react";
import { ChartAnalysisResult, ChartAnnotations } from "../data/derivIndices";

interface AnnotatedChartCanvasProps {
  imageUrl: string;
  analysis: ChartAnalysisResult | null;
}

export function getDefaultAnnotations(action: "BUY" | "SELL"): ChartAnnotations {
  if (action === "BUY") {
    return {
      entryY: 62,
      stopLossY: 78,
      tp1Y: 40,
      tp2Y: 20,
      currentPriceX: 78,
      currentPriceY: 54,
      orderBlock: {
        xStart: 38,
        xEnd: 89,
        yTop: 59,
        yBottom: 69,
        label: "BULLISH ORDER BLOCK (OB) + DEMAND",
      },
      fvgZone: {
        xStart: 50,
        xEnd: 88,
        yTop: 50,
        yBottom: 58,
        label: "FVG (Fair Value Gap)",
      },
      structureMarkers: [
        { xStart: 28, xEnd: 66, y: 36, label: "BOS HAUSSIER" },
        { xStart: 18, xEnd: 48, y: 74, label: "LIQUIDITY SWEEP (SSL)" },
      ],
    };
  }
  return {
    entryY: 36,
    stopLossY: 20,
    tp1Y: 58,
    tp2Y: 78,
    currentPriceX: 78,
    currentPriceY: 44,
    orderBlock: {
      xStart: 38,
      xEnd: 89,
      yTop: 29,
      yBottom: 39,
      label: "BEARISH ORDER BLOCK (OB) + SUPPLY",
    },
    fvgZone: {
      xStart: 50,
      xEnd: 88,
      yTop: 40,
      yBottom: 48,
      label: "FVG (Fair Value Gap)",
    },
    structureMarkers: [
      { xStart: 28, xEnd: 66, y: 62, label: "BOS / CHoCH BAISSIER" },
      { xStart: 18, xEnd: 48, y: 24, label: "LIQUIDITY SWEEP (BSL)" },
    ],
  };
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const AnnotatedChartCanvas: React.FC<AnnotatedChartCanvasProps> = ({
  imageUrl,
  analysis,
}) => {
  const [showOverlay, setShowOverlay] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showProjection, setShowProjection] = useState(true);
  const [annotations, setAnnotations] = useState<ChartAnnotations>(getDefaultAnnotations("BUY"));
  const [draggingKey, setDraggingKey] = useState<"entryY" | "stopLossY" | "tp1Y" | "tp2Y" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!analysis) return;
    const ca = analysis.chartAnnotations;
    if (ca) {
      setAnnotations({
        entryY: clamp(Number(ca.entryY) || 60, 10, 88),
        stopLossY: clamp(Number(ca.stopLossY) || 76, 8, 92),
        tp1Y: clamp(Number(ca.tp1Y) || 40, 8, 90),
        tp2Y: clamp(Number(ca.tp2Y) || 22, 6, 92),
        currentPriceX: clamp(Number(ca.currentPriceX) || 76, 40, 90),
        currentPriceY: clamp(Number(ca.currentPriceY) || 52, 12, 88),
        orderBlock: ca.orderBlock || getDefaultAnnotations(analysis.action).orderBlock,
        fvgZone: ca.fvgZone || getDefaultAnnotations(analysis.action).fvgZone,
        structureMarkers:
          Array.isArray(ca.structureMarkers) && ca.structureMarkers.length > 0
            ? ca.structureMarkers
            : getDefaultAnnotations(analysis.action).structureMarkers,
      });
    } else {
      setAnnotations(getDefaultAnnotations(analysis.action));
    }
  }, [analysis]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingKey || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const yPct = clamp(((e.clientY - rect.top) / rect.height) * 100, 6, 94);
    setAnnotations((prev) => ({ ...prev, [draggingKey]: Number(yPct.toFixed(1)) }));
  };

  const handleDownloadPNG = () => {
    if (!imageUrl || !analysis) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = img.naturalWidth || 1280;
      const h = img.naturalHeight || 760;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);

      const px = (x: number) => (x / 100) * w;
      const py = (y: number) => (y / 100) * h;
      const isBuy = analysis.action === "BUY";

      if (showZones) {
        const obX = px(annotations.orderBlock.xStart);
        const obW = px(annotations.orderBlock.xEnd) - obX;
        const obY = py(Math.min(annotations.orderBlock.yTop, annotations.orderBlock.yBottom));
        const obH = Math.max(Math.abs(py(annotations.orderBlock.yBottom) - py(annotations.orderBlock.yTop)), 22);
        ctx.fillStyle = isBuy ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)";
        ctx.strokeStyle = isBuy ? "#10B981" : "#EF4444";
        ctx.lineWidth = 2;
        ctx.fillRect(obX, obY, obW, obH);
        ctx.strokeRect(obX, obY, obW, obH);
      }

      const drawLine = (yPct: number, label: string, price: string, color: string) => {
        const y = py(yPct);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(px(20), y);
        ctx.lineTo(px(96), y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.fillRect(px(74), y - 11, px(22), 22);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`${label}: ${price}`, px(75), y + 4);
      };

      drawLine(annotations.tp2Y, "TP2", analysis.takeProfit2, "#15803D");
      drawLine(annotations.tp1Y, "TP1 (BE)", analysis.takeProfit1, "#16A34A");
      drawLine(annotations.entryY, `ENTRY (${analysis.action})`, analysis.entryPrice, "#0284C7");
      drawLine(annotations.stopLossY, "SL", analysis.stopLoss, "#DC2626");

      const a = document.createElement("a");
      a.download = `setup-${analysis.asset.replace(/\s+/g, "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = imageUrl;
  };

  if (!imageUrl) return null;
  const isBuy = analysis?.action !== "SELL";
  const obTop = Math.min(annotations.orderBlock.yTop, annotations.orderBlock.yBottom);
  const obHeight = Math.max(Math.abs(annotations.orderBlock.yBottom - annotations.orderBlock.yTop), 4);
  const fvgTop = Math.min(annotations.fvgZone.yTop, annotations.fvgZone.yBottom);
  const fvgHeight = Math.max(Math.abs(annotations.fvgZone.yBottom - annotations.fvgZone.yTop), 3.5);

  const p1X = annotations.currentPriceX;
  const p1Y = annotations.currentPriceY;
  const p2X = clamp(p1X + 5, 65, 86);
  const p2Y = annotations.entryY;
  const p3X = clamp(p2X + 5, 72, 91);
  const p3Y = annotations.tp1Y;
  const p4X = clamp(p3X + 5, 78, 95);
  const p4Y = annotations.tp2Y;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#0F172A] border-b border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-emerald-400 inline-flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Traçage IA sur Graphique :</span>
          </span>
          <button
            type="button"
            onClick={() => setShowOverlay(!showOverlay)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium ${
              showOverlay ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-slate-800 text-slate-400"
            }`}
          >
            {showOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showOverlay ? "Tracés Actifs" : "Masqués"}</span>
          </button>
          {showOverlay && (
            <>
              <button
                type="button"
                onClick={() => setShowZones(!showZones)}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  showZones ? "bg-slate-800 text-slate-200 border border-slate-700" : "text-slate-500"
                }`}
              >
                OB & FVG
              </button>
              <button
                type="button"
                onClick={() => setShowProjection(!showProjection)}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  showProjection ? "bg-slate-800 text-slate-200 border border-slate-700" : "text-slate-500"
                }`}
              >
                Projection IA
              </button>
              <button
                type="button"
                onClick={() => analysis && setAnnotations(analysis.chartAnnotations || getDefaultAnnotations(analysis.action))}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-400 hover:text-slate-200"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleDownloadPNG}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Télécharger Annoté</span>
        </button>
      </div>

      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDraggingKey(null)}
        onPointerLeave={() => setDraggingKey(null)}
        className="relative bg-[#0B1120] select-none overflow-hidden"
      >
        <img
          src={imageUrl}
          alt="Graphique TradingView / MT5 annoté par IA"
          referrerPolicy="no-referrer"
          className="w-full h-auto block max-h-[540px] object-fill"
        />

        {showOverlay && analysis && (
          <div className="absolute inset-0 pointer-events-none">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0">
              {showZones && (
                <>
                  <rect
                    x={annotations.orderBlock.xStart}
                    y={obTop}
                    width={Math.max(annotations.orderBlock.xEnd - annotations.orderBlock.xStart, 15)}
                    height={obHeight}
                    fill={isBuy ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)"}
                    stroke={isBuy ? "#10B981" : "#EF4444"}
                    strokeWidth="0.35"
                  />
                  <rect
                    x={annotations.fvgZone.xStart}
                    y={fvgTop}
                    width={Math.max(annotations.fvgZone.xEnd - annotations.fvgZone.xStart, 15)}
                    height={fvgHeight}
                    fill="rgba(56,189,248,0.14)"
                    stroke="#38BDF8"
                    strokeWidth="0.28"
                    strokeDasharray="1,1"
                  />
                  {annotations.structureMarkers.map((m, idx) => (
                    <line
                      key={idx}
                      x1={m.xStart}
                      y1={m.y}
                      x2={m.xEnd}
                      y2={m.y}
                      stroke="#E2E8F0"
                      strokeWidth="0.3"
                      strokeDasharray="1.2,1.2"
                    />
                  ))}
                </>
              )}

              <rect
                x={70}
                y={Math.min(annotations.entryY, annotations.tp2Y)}
                width={21}
                height={Math.abs(annotations.tp2Y - annotations.entryY)}
                fill="rgba(16,185,129,0.16)"
                stroke="rgba(16,185,129,0.45)"
                strokeWidth="0.25"
              />
              <rect
                x={70}
                y={Math.min(annotations.entryY, annotations.stopLossY)}
                width={21}
                height={Math.abs(annotations.stopLossY - annotations.entryY)}
                fill="rgba(239,68,68,0.22)"
                stroke="rgba(239,68,68,0.5)"
                strokeWidth="0.25"
              />

              {showProjection && (
                <>
                  <polyline
                    points={`${p1X},${p1Y} ${p2X},${p2Y} ${p3X},${p3Y} ${p4X},${p4Y}`}
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="0.55"
                    strokeDasharray="1.4,1"
                  />
                  <circle cx={p1X} cy={p1Y} r="0.9" fill="#F8FAFC" />
                  <circle cx={p2X} cy={p2Y} r="1.1" fill="#38BDF8" />
                  <circle cx={p3X} cy={p3Y} r="1.0" fill="#10B981" />
                  <circle cx={p4X} cy={p4Y} r="1.1" fill="#10B981" />
                </>
              )}
            </svg>

            {showZones && (
              <>
                <div
                  style={{ left: `${annotations.orderBlock.xStart + 1}%`, top: `${obTop + 0.5}%` }}
                  className={`absolute px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isBuy
                      ? "bg-emerald-950/90 text-emerald-300 border border-emerald-500/40"
                      : "bg-red-950/90 text-red-300 border border-red-500/40"
                  }`}
                >
                  {annotations.orderBlock.label}
                </div>
                <div
                  style={{ left: `${annotations.fvgZone.xStart + 1}%`, top: `${fvgTop + 0.4}%` }}
                  className="absolute px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-950/90 text-sky-300 border border-sky-500/40"
                >
                  {annotations.fvgZone.label}
                </div>
                {annotations.structureMarkers.map((m, idx) => (
                  <div
                    key={idx}
                    style={{ left: `${(m.xStart + m.xEnd) / 2 - 5}%`, top: `${clamp(m.y - 3.5, 2, 94)}%` }}
                    className="absolute px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-900/90 text-slate-200 border border-slate-700"
                  >
                    {m.label}
                  </div>
                ))}
              </>
            )}

            {(
              [
                {
                  key: "tp2Y" as const,
                  label: "TP2",
                  price: analysis.takeProfit2,
                  lineClass: "border-emerald-400",
                  badgeClass: "bg-[#15803D] text-white border-emerald-400",
                },
                {
                  key: "tp1Y" as const,
                  label: "TP1 (BE)",
                  price: analysis.takeProfit1,
                  lineClass: "border-emerald-500",
                  badgeClass: "bg-[#16A34A] text-white border-emerald-300",
                },
                {
                  key: "entryY" as const,
                  label: `ENTRY (${analysis.action})`,
                  price: analysis.entryPrice,
                  lineClass: "border-sky-400",
                  badgeClass: "bg-[#0284C7] text-white border-sky-300",
                },
                {
                  key: "stopLossY" as const,
                  label: "STOP LOSS",
                  price: analysis.stopLoss,
                  lineClass: "border-red-500",
                  badgeClass: "bg-[#DC2626] text-white border-red-300",
                },
              ] as const
            ).map((lvl) => (
              <div
                key={lvl.key}
                style={{ top: `${annotations[lvl.key]}%` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingKey(lvl.key);
                }}
                className="absolute left-[18%] right-2 -translate-y-1/2 pointer-events-auto cursor-ns-resize group flex items-center"
              >
                <div className={`w-full border-t-2 border-dashed ${lvl.lineClass} group-hover:border-solid`} />
                <div className={`ml-auto shrink-0 px-2 py-0.5 rounded text-[11px] font-mono font-semibold border shadow-md whitespace-nowrap ${lvl.badgeClass}`}>
                  {lvl.label} : {lvl.price}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-[#0F172A]/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          Astuce : Glissez les lignes <strong>ENTRY / SL / TP1 / TP2</strong> verticalement sur votre capture pour affiner leur alignement.
        </span>
      </div>
    </div>
  );
};
