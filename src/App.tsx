import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  ScanEye,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  MessageSquare,
  Download,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import {
  SAMPLE_CHART_PRESETS,
  ChartAnalysisResult,
  generateSyntheticChartImage,
  DERIV_INDICES_SPECS,
} from "./data/derivIndices";
import { PositionCalculatorView } from "./components/PositionCalculatorView";
import { AssistantPanel } from "./components/AssistantPanel";
import { DerivSpecsView } from "./components/DerivSpecsView";
import { AnnotatedChartCanvas } from "./components/AnnotatedChartCanvas";
import { LiveMarketTerminal } from "./components/LiveMarketTerminal";

type ActiveTab = "live_market" | "analyzer" | "assistant" | "calculator" | "specs";

const STORAGE_KEY = "deriv_synthetic_ai_history_v1";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("live_market");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("v75_m15_buy");
  const [currentImageBase64, setCurrentImageBase64] = useState<string>("");
  const [currentMimeType, setCurrentMimeType] = useState<string>("image/png");
  const [activeAnalysis, setActiveAnalysis] = useState<ChartAnalysisResult | null>(null);
  const [history, setHistory] = useState<ChartAnalysisResult[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");

  // Optional context overrides for live Vision AI analysis
  const [assetHint, setAssetHint] = useState<string>("AUTO");
  const [timeframeHint, setTimeframeHint] = useState<string>("AUTO");
  const [accountBalance, setAccountBalance] = useState<number>(500);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [userNotes, setUserNotes] = useState<string>("");

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize default chart preset and saved history
  useEffect(() => {
    const initialPreset = SAMPLE_CHART_PRESETS[0];
    const generatedImg = generateSyntheticChartImage(initialPreset.id);
    setCurrentImageBase64(generatedImg);

    const initialResult: ChartAnalysisResult = {
      id: "preset-v75-m15",
      timestamp: new Date().toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      imageUrl: generatedImg,
      ...initialPreset.precomputedAnalysis,
    };

    setActiveAnalysis(initialResult);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistory(parsed);
          return;
        }
      }
    } catch {
      // ignore storage errors
    }

    // Seed initial history with our 4 institutional presets so table is populated
    const seededHistory: ChartAnalysisResult[] = SAMPLE_CHART_PRESETS.map(
      (preset, index) => ({
        id: `seed-${preset.id}`,
        timestamp: new Date(Date.now() - index * 1800000).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        imageUrl: generateSyntheticChartImage(preset.id),
        ...preset.precomputedAnalysis,
      })
    );
    setHistory(seededHistory);
  }, []);

  // Support global Ctrl+V paste of TradingView / MT5 screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            readUploadedFile(blob);
            setActiveTab("analyzer");
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const saveHistory = (newHistory: ChartAnalysisResult[]) => {
    setHistory(newHistory);
    try {
      // Save up to 12 recent items to avoid localStorage quota limits with base64 images
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory.slice(0, 12)));
    } catch {
      // ignore quota error
    }
  };

  const readUploadedFile = (file: File) => {
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const base64Data = reader.result;
        const mime = file.type || "image/png";
        setCurrentImageBase64(base64Data);
        setCurrentMimeType(mime);
        setSelectedPresetId("custom_upload");
        // Immediately clear old preset analysis so previous tracings never stay on the new chart
        setActiveAnalysis(null);
        // Automatically launch Vision AI analysis on the newly uploaded chart
        void executeVisionAnalysis(base64Data, mime);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readUploadedFile(file);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setErrorMsg(null);
    setSelectedPresetId(presetId);
    const preset = SAMPLE_CHART_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const imgData = generateSyntheticChartImage(preset.id);
    setCurrentImageBase64(imgData);
    setCurrentMimeType("image/png");

    const loadedResult: ChartAnalysisResult = {
      id: `preset-${preset.id}-${Date.now()}`,
      timestamp: new Date().toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      imageUrl: imgData,
      ...preset.precomputedAnalysis,
    };
    setActiveAnalysis(loadedResult);
  };

  const compressAndMeasureChart = (
    rawDataUrl: string
  ): Promise<{
    optimizedBase64: string;
    mimeType: string;
    pixelMetrics: {
      isBearish: boolean;
      obY: number;
      currentPriceX: number;
      currentPriceY: number;
    };
  }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1150;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({
            optimizedBase64: rawDataUrl,
            mimeType: "image/png",
            pixelMetrics: {
              isBearish: true,
              obY: 44,
              currentPriceX: 78,
              currentPriceY: 68,
            },
          });
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const optimizedBase64 = canvas.toDataURL("image/jpeg", 0.85);

        // Scan left half vs right half of chart area for candle/EMA vertical center of mass
        const data = ctx.getImageData(0, 0, w, h).data;
        let leftYWeight = 0;
        let leftCount = 0;
        let rightYWeight = 0;
        let rightCount = 0;
        let lastCandleX = Math.round(w * 0.76);
        let lastCandleY = Math.round(h * 0.62);

        const yStart = Math.round(h * 0.1);
        const yEnd = Math.round(h * 0.88);
        const xStart = Math.round(w * 0.08);
        const xEnd = Math.round(w * 0.88);
        const xMid = Math.round((xStart + xEnd) / 2);

        for (let y = yStart; y < yEnd; y += 3) {
          for (let x = xStart; x < xEnd; x += 3) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Detect red/green/orange candlestick or EMA pixels (non-background)
            const isRedOrOrange = r > 155 && r - b > 65;
            const isGreenOrCyan = g > 140 && g - r > 35;
            if (isRedOrOrange || isGreenOrCyan) {
              if (x < xMid) {
                leftYWeight += y;
                leftCount++;
              } else {
                rightYWeight += y;
                rightCount++;
                if (x >= lastCandleX - 6) {
                  lastCandleX = x;
                  lastCandleY = y;
                }
              }
            }
          }
        }

        const avgLeftY = leftCount > 10 ? leftYWeight / leftCount : h * 0.35;
        const avgRightY = rightCount > 10 ? rightYWeight / rightCount : h * 0.65;
        // In screen coordinates, larger Y means lower on screen (bearish descent)
        const isBearish = avgRightY >= avgLeftY;
        const currentPriceX = Math.min(88, Math.max(55, Math.round((lastCandleX / w) * 100)));
        const currentPriceY = Math.min(86, Math.max(16, Math.round((lastCandleY / h) * 100)));
        const obY = isBearish
          ? Math.max(18, Math.min(62, currentPriceY - 16))
          : Math.min(82, Math.max(38, currentPriceY + 14));

        resolve({
          optimizedBase64,
          mimeType: "image/jpeg",
          pixelMetrics: {
            isBearish,
            obY,
            currentPriceX,
            currentPriceY,
          },
        });
      };
      img.onerror = () => {
        resolve({
          optimizedBase64: rawDataUrl,
          mimeType: "image/png",
          pixelMetrics: {
            isBearish: true,
            obY: 44,
            currentPriceX: 78,
            currentPriceY: 68,
          },
        });
      };
      img.src = rawDataUrl;
    });
  };

  const executeVisionAnalysis = async (
    overrideBase64?: string,
    overrideMime?: string
  ) => {
    const imgToAnalyze = overrideBase64 || currentImageBase64;
    if (!imgToAnalyze || isAnalyzing) return;
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const { optimizedBase64, mimeType: optimizedMime, pixelMetrics } =
        await compressAndMeasureChart(imgToAnalyze);

      const response = await fetch("/api/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: optimizedBase64,
          mimeType: overrideMime && !overrideBase64 ? optimizedMime : optimizedMime,
          assetHint,
          timeframeHint,
          accountBalance,
          riskPercent,
          userNotes,
          pixelMetrics,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || "Échec de l'analyse Vision AI du graphique."
        );
      }

      const newResult: ChartAnalysisResult = {
        id: `scan-${Date.now()}`,
        timestamp: new Date().toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        imageUrl: imgToAnalyze,
        asset: data.asset,
        timeframe: data.timeframe,
        marketStructure: data.marketStructure,
        keyZones: data.keyZones,
        technicalConfirmation: data.technicalConfirmation,
        action: data.action === "SELL" ? "SELL" : "BUY",
        entryPrice: data.entryPrice,
        stopLoss: data.stopLoss,
        takeProfit1: data.takeProfit1,
        takeProfit2: data.takeProfit2,
        riskRewardRatio: data.riskRewardRatio,
        recommendedLot: data.recommendedLot,
        managementAdvice: data.managementAdvice,
        smcConceptsDetected: Array.isArray(data.smcConceptsDetected)
          ? data.smcConceptsDetected
          : ["Structure SMC", "Order Block", "Price Action"],
        confidenceNote: data.confidenceNote || "Analyse Vision AI complétée.",
        formattedReport: data.formattedReport,
        chartAnnotations: data.chartAnnotations,
      };

      setActiveAnalysis(newResult);
      setHistory((prev) => {
        const updated = [newResult, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 12)));
        } catch {
          // ignore quota error
        }
        return updated;
      });
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          "Une erreur est survenue lors de l'analyse Vision AI. Vérifiez votre image et réessayez."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunVisionAnalysis = () => {
    void executeVisionAnalysis();
  };

  const handleCopyFormattedReport = () => {
    if (!activeAnalysis) return;
    navigator.clipboard.writeText(activeAnalysis.formattedReport);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = [
      "Date",
      "Actif",
      "Timeframe",
      "Action",
      "Entry",
      "StopLoss",
      "TP1",
      "TP2",
      "RR",
      "LotRecommande",
      "Consigne",
    ];
    const rows = history.map((item) => [
      `"${item.timestamp}"`,
      `"${item.asset}"`,
      `"${item.timeframe}"`,
      `"${item.action}"`,
      `"${item.entryPrice}"`,
      `"${item.stopLoss}"`,
      `"${item.takeProfit1}"`,
      `"${item.takeProfit2}"`,
      `"${item.riskRewardRatio}"`,
      `"${item.recommendedLot}"`,
      `"${item.managementAdvice.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "deriv_synthetic_ai_setups.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistory = history.filter((item) =>
    historyFilter === "ALL" ? true : item.action === historyFilter
  );

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col">
      {/* Top Bar Contract: Strictly 1 row, 3 zones */}
      <header className="flex items-center justify-between gap-6 px-6 py-4 border-b border-slate-800 bg-[#0F172A]/95 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("live_market");
          }}
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          Deriv Synthetic AI
        </a>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => setActiveTab("live_market")}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeTab === "live_market"
                ? "text-slate-100 border-emerald-500"
                : "border-transparent"
            }`}
          >
            Marché Temps Réel (API Deriv)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analyzer")}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeTab === "analyzer"
                ? "text-slate-100 border-emerald-500"
                : "border-transparent"
            }`}
          >
            Analyse Capture Vision
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("assistant")}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeTab === "assistant"
                ? "text-slate-100 border-emerald-500"
                : "border-transparent"
            }`}
          >
            Assistant SMC/ICT
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("calculator")}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeTab === "calculator"
                ? "text-slate-100 border-emerald-500"
                : "border-transparent"
            }`}
          >
            Calculateur de Lots
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("specs")}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeTab === "specs"
                ? "text-slate-100 border-emerald-500"
                : "border-transparent"
            }`}
          >
            Spécifications
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-300 bg-[#1E293B] border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("analyzer");
              fileInputRef.current?.click();
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#16A34A] rounded-lg hover:bg-emerald-500 transition-colors whitespace-nowrap"
          >
            + Analyser un Graphique
          </button>
        </div>
      </header>

      {/* Mobile Tab Selector */}
      <div className="flex lg:hidden items-center gap-1 px-4 py-2 border-b border-slate-800 bg-[#1E293B]/60 overflow-x-auto">
        {(
          [
            { id: "live_market", label: "Marché Temps Réel (Deriv)" },
            { id: "analyzer", label: "Analyse Capture" },
            { id: "assistant", label: "Assistant SMC" },
            { id: "calculator", label: "Calculateur Lots" },
            { id: "specs", label: "Spécifications" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8">
        {activeTab === "live_market" && (
          <LiveMarketTerminal
            accountBalance={accountBalance}
            riskPercent={riskPercent}
          />
        )}

        {activeTab === "analyzer" && (
          <div className="space-y-10">
            {/* Top Desk Header & Preset Selector */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <span>Expert Senior Deriv (ex-Binary.com)</span>
                  <span aria-hidden="true">·</span>
                  <span>Price Action, Smart Money Concepts (SMC) & ICT</span>
                  <span aria-hidden="true">·</span>
                  <span>Vision par Ordinateur MT5 / TradingView</span>
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight"
                  style={{ textWrap: "balance" }}
                >
                  Analyseur de Graphiques Synthétiques & Générateur de Setups Institutionnels
                </h1>
              </div>

              {/* Interactive Sample Chart Switcher */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-400">
                  Graphiques de démonstration MT5 / TradingView (ou importez votre capture) :
                </span>
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#1E293B] border border-slate-800 rounded-lg">
                  {SAMPLE_CHART_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        selectedPresetId === preset.id
                          ? "bg-[#0F172A] text-emerald-400 shadow-sm border border-slate-700"
                          : "text-slate-300 hover:text-slate-100"
                      }`}
                    >
                      {preset.asset.replace(" Index", "")} ({preset.timeframe})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-950/50 border border-red-500/40 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-red-200">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-red-300 hover:text-white font-medium"
                >
                  Fermer
                </button>
              </div>
            )}

            {/* Main 2-Column Workspace: Left = Vision Chart & Parameters | Right = Structured Setup Output */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              {/* Left Column (7 cols): Chart Viewport + Vision AI Controls */}
              <div className="xl:col-span-7 space-y-6">
                {/* Chart Image Dropzone & Preview */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) readUploadedFile(file);
                  }}
                  className={`bg-[#1E293B] border rounded-xl overflow-hidden transition-colors ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-950/10"
                      : "border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="font-semibold text-slate-100">
                        Capture Graphique MT5 / TradingView
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-400">
                        Glisser-déposer ou coller (Ctrl+V)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0F172A] hover:bg-slate-900 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Importer une image</span>
                      </button>
                    </div>
                  </div>

                  {/* Chart Canvas / Uploaded Image Display with AI Visual Tracing */}
                  <div className="relative bg-[#0B1120] min-h-[360px]">
                    {currentImageBase64 ? (
                      <AnnotatedChartCanvas
                        imageUrl={currentImageBase64}
                        analysis={activeAnalysis}
                      />
                    ) : (
                      <div className="p-12 text-center space-y-3">
                        <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-sm text-slate-300 font-medium">
                          Importez une capture d'écran TradingView ou MetaTrader 5
                        </p>
                        <p className="text-xs text-slate-500">
                          Formats supportés : PNG, JPG, WEBP ou Ctrl+V direct depuis le presse-papiers
                        </p>
                      </div>
                    )}

                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                        <div className="text-sm font-semibold text-slate-100">
                          Analyse & Traçage Visuel IA en cours (SMC / ICT / Price Action)...
                        </div>
                        <p className="text-xs text-slate-400 max-w-md">
                          Détection de l'indice Deriv, traçage des Order Blocks, FVG, BOS/CHoCH et des niveaux Entry, SL, TP1, TP2 directement sur votre capture.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vision AI Execution Controls */}
                <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-100">
                      Paramètres d'Analyse & Calibrage du Risque
                    </span>
                    <span className="text-xs text-slate-400">
                      Détection automatique par défaut
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Indice Deriv (Optionnel)
                      </label>
                      <select
                        value={assetHint}
                        onChange={(e) => setAssetHint(e.target.value)}
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="AUTO">Auto-détection Vision AI</option>
                        {DERIV_INDICES_SPECS.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Unité de Temps
                      </label>
                      <select
                        value={timeframeHint}
                        onChange={(e) => setTimeframeHint(e.target.value)}
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="AUTO">Auto-détection</option>
                        <option value="M1">M1 (1 Minute)</option>
                        <option value="M5">M5 (5 Minutes)</option>
                        <option value="M15">M15 (15 Minutes)</option>
                        <option value="30m">M30 (30 Minutes)</option>
                        <option value="H1">H1 (1 Heure)</option>
                        <option value="H4">H4 (4 Heures)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Capital MT5 ($ USD)
                      </label>
                      <input
                        type="number"
                        min={10}
                        value={accountBalance}
                        onChange={(e) =>
                          setAccountBalance(Math.max(10, Number(e.target.value)))
                        }
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Risque Visé (%)
                      </label>
                      <input
                        type="number"
                        min={0.25}
                        max={10}
                        step={0.25}
                        value={riskPercent}
                        onChange={(e) =>
                          setRiskPercent(Math.max(0.25, Number(e.target.value)))
                        }
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    <input
                      type="text"
                      value={userNotes}
                      onChange={(e) => setUserNotes(e.target.value)}
                      placeholder="Note facultative (ex: Vérifier le rejet sur l'Order Block H1 ou le FVG M15)..."
                      className="flex-1 bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />

                    <button
                      type="button"
                      onClick={handleRunVisionAnalysis}
                      disabled={isAnalyzing || !currentImageBase64}
                      className="px-5 py-2.5 bg-[#16A34A] hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyse Vision en cours...</span>
                        </>
                      ) : (
                        <>
                          <ScanEye className="w-4 h-4" />
                          <span>Analyser le Graphique par Vision IA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Structured Institutional Output & Official Format */}
              <div className="xl:col-span-5 space-y-6">
                {activeAnalysis ? (
                  <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 space-y-6">
                    {/* Section 1: Header & Action */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
                          <span>{activeAnalysis.timestamp}</span>
                          <span aria-hidden="true">·</span>
                          <span>Unité : {activeAnalysis.timeframe}</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-100">
                          📊 ANALYSE DU GRAPHIQUE : {activeAnalysis.asset} (
                          {activeAnalysis.timeframe})
                        </h2>
                      </div>

                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono shrink-0 ${
                          activeAnalysis.action === "BUY"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/15 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {activeAnalysis.action === "BUY" ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        <span>
                          {activeAnalysis.action === "BUY"
                            ? "BUY (Achat)"
                            : "SELL (Vente)"}
                        </span>
                      </div>
                    </div>

                    {/* Section 2: Exact Trade Levels Grid (Tabular Numerals) */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-semibold text-slate-200">
                          🎯 PLAN DE TRADING RECOMMANDE
                        </span>
                        <span className="text-xs font-mono text-slate-300">
                          Ratio Risque/Rendement :{" "}
                          <strong className="text-emerald-400">
                            {activeAnalysis.riskRewardRatio}
                          </strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-3">
                          <span className="text-[11px] text-slate-400 block">
                            Entrée (ENTRY)
                          </span>
                          <span className="text-base font-semibold font-mono tabular-nums text-sky-400 mt-0.5 block">
                            {activeAnalysis.entryPrice}
                          </span>
                        </div>

                        <div className="bg-[#0F172A] border border-red-500/30 rounded-lg p-3">
                          <span className="text-[11px] text-red-300 block">
                            Stop Loss (SL) · Rouge
                          </span>
                          <span className="text-base font-semibold font-mono tabular-nums text-[#EF4444] mt-0.5 block">
                            {activeAnalysis.stopLoss}
                          </span>
                        </div>

                        <div className="bg-[#0F172A] border border-emerald-500/30 rounded-lg p-3">
                          <span className="text-[11px] text-emerald-300 block">
                            Take Profit 1 (TP1) · Vert
                          </span>
                          <span className="text-base font-semibold font-mono tabular-nums text-[#10B981] mt-0.5 block">
                            {activeAnalysis.takeProfit1}
                          </span>
                        </div>

                        <div className="bg-[#0F172A] border border-emerald-500/30 rounded-lg p-3">
                          <span className="text-[11px] text-emerald-300 block">
                            Take Profit 2 (TP2) · Vert
                          </span>
                          <span className="text-base font-semibold font-mono tabular-nums text-[#10B981] mt-0.5 block">
                            {activeAnalysis.takeProfit2}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Technical Breakdown */}
                    <div className="space-y-3 text-xs leading-relaxed border-t border-slate-800 pt-4">
                      <div>
                        <span className="font-semibold text-slate-200">
                          Structure du marché :{" "}
                        </span>
                        <span className="text-slate-300">
                          {activeAnalysis.marketStructure}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200">
                          Zones clés identifiées :{" "}
                        </span>
                        <span className="text-slate-300">
                          {activeAnalysis.keyZones}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200">
                          Confirmation technique :{" "}
                        </span>
                        <span className="text-slate-300">
                          {activeAnalysis.technicalConfirmation}
                        </span>
                      </div>
                      <div className="text-slate-400 pt-1">
                        Confluences SMC :{" "}
                        {activeAnalysis.smcConceptsDetected.join(" · ")}
                      </div>
                    </div>

                    {/* Section 4: Risk Management & Lot Recommendation */}
                    <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4 space-y-2 text-xs">
                      <div className="font-semibold text-amber-400">
                        ⚠️ GESTION DU RISQUE & CONSEILS
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Lot recommandé :</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-100">
                          {activeAnalysis.recommendedLot}
                        </span>
                      </div>
                      <div className="text-slate-300 leading-relaxed pt-1">
                        <span className="font-semibold text-slate-200">
                          Consigne :{" "}
                        </span>
                        {activeAnalysis.managementAdvice}
                      </div>
                    </div>

                    {/* Section 5: Exact Required Formatted Output Block with 1-Click Copy */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">
                          Format de Réponse Officiel (Prêt à copier)
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyFormattedReport}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0F172A] hover:bg-slate-900 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                        >
                          {copiedReport ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">
                                Plan copié
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copier le Plan</span>
                            </>
                          )}
                        </button>
                      </div>

                      <pre className="bg-[#0F172A] border border-slate-800 rounded-lg p-3.5 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                        {activeAnalysis.formattedReport}
                      </pre>
                    </div>

                    {/* Section 6: Secondary Action Links */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab("calculator")}
                        className="flex items-center justify-center gap-2 py-2 px-3 bg-[#0F172A] hover:bg-slate-900 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                      >
                        <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Simuler Lots & BE</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          document
                            .getElementById("direct-chat-section")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="flex items-center justify-center gap-2 py-2 px-3 bg-[#0F172A] hover:bg-slate-900 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                        <span>Discuter dans le Chat</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-8 text-center space-y-4">
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                        <h3 className="text-base font-semibold text-slate-100">
                          Analyse & Calibrage SMC/ICT de votre capture en cours...
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                          Lecture de l'échelle de prix à droite, de la tendance par rapport à la moyenne mobile (EMA) et traçage automatique des zones Order Block, FVG, Entry, SL, TP1 et TP2.
                        </p>
                      </>
                    ) : (
                      <>
                        <ScanEye className="w-8 h-8 text-emerald-400 mx-auto" />
                        <h3 className="text-base font-semibold text-slate-100">
                          Nouvelle capture chargée — Prête pour l'analyse
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                          Cliquez sur le bouton ci-dessous pour lancer l'analyse Vision IA et tracer les vrais niveaux sur votre graphique.
                        </p>
                        <button
                          type="button"
                          onClick={handleRunVisionAnalysis}
                          className="px-5 py-2.5 bg-[#16A34A] hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors"
                        >
                          <ScanEye className="w-4 h-4" />
                          <span>Analyser & Tracer maintenant</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Embedded Interactive Chat Section right below the Analyzer */}
            <div id="direct-chat-section" className="pt-6 border-t border-slate-800">
              <AssistantPanel activeAnalysis={activeAnalysis} />
            </div>

            {/* Section: Historical Setups Journal */}
            <div className="space-y-4 pt-6 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    Journal des Analyses & Setups Deriv
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cliquez sur une ligne pour recharger le graphique et le plan de trading complet.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 p-1 bg-[#1E293B] border border-slate-800 rounded-lg">
                    {(["ALL", "BUY", "SELL"] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setHistoryFilter(filter)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          historyFilter === filter
                            ? "bg-[#0F172A] text-slate-100 shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {filter === "ALL" ? "Tous" : filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-[#0F172A]/60 text-xs font-medium text-slate-400">
                        <th className="py-3 px-4">Horodatage</th>
                        <th className="py-3 px-4">Actif & Unité</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4 text-right">Entrée (ENTRY)</th>
                        <th className="py-3 px-4 text-right">Stop Loss (SL)</th>
                        <th className="py-3 px-4 text-right">TP1</th>
                        <th className="py-3 px-4 text-right">TP2</th>
                        <th className="py-3 px-4 text-right">Ratio R:R</th>
                        <th className="py-3 px-4 text-right">Lot Min</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {filteredHistory.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => {
                            setActiveAnalysis(item);
                            setCurrentImageBase64(item.imageUrl);
                          }}
                          className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                            activeAnalysis?.id === item.id
                              ? "bg-slate-800/30"
                              : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                            {item.timestamp}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-100 whitespace-nowrap">
                            {item.asset}{" "}
                            <span className="text-slate-400 font-normal">
                              · {item.timeframe}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`font-mono font-semibold ${
                                item.action === "BUY"
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {item.action === "BUY"
                                ? "BUY (Achat)"
                                : "SELL (Vente)"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-sky-400 whitespace-nowrap">
                            {item.entryPrice}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-red-400 whitespace-nowrap">
                            {item.stopLoss}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 whitespace-nowrap">
                            {item.takeProfit1}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 whitespace-nowrap">
                            {item.takeProfit2}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200 whitespace-nowrap">
                            {item.riskRewardRatio}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                            {item.recommendedLot.split(" ")[0]}
                          </td>
                          <td
                            className="py-3 px-4 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                saveHistory(
                                  history.filter((h) => h.id !== item.id)
                                )
                              }
                              className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                              title="Supprimer du journal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "assistant" && (
          <AssistantPanel activeAnalysis={activeAnalysis} />
        )}

        {activeTab === "calculator" && (
          <PositionCalculatorView activeAnalysis={activeAnalysis} />
        )}

        {activeTab === "specs" && <DerivSpecsView />}
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="border-t border-slate-800/80 py-5 px-6 mt-auto">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Deriv Synthetic AI · Analyseur Price Action, Smart Money Concepts (SMC) & ICT
          </div>
          <div className="flex items-center gap-3">
            <span>Volatility Indices (V10–V250)</span>
            <span aria-hidden="true">·</span>
            <span>Boom & Crash 300/500/1000</span>
            <span aria-hidden="true">·</span>
            <span>Step & Jump Indices</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
