import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Sparkles,
  RefreshCw,
  Settings2,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Radio,
  ShieldCheck,
} from "lucide-react";

export interface CandleBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LiveSMCSetup {
  action: "BUY" | "SELL";
  currentPrice: number;
  ema20: number;
  ema50: number;
  swingHigh: number;
  swingLow: number;
  atr: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: string;
  recommendedLot: string;
  orderBlock: {
    topPrice: number;
    bottomPrice: number;
    startIndex: number;
    label: string;
  };
  fvgZone: {
    topPrice: number;
    bottomPrice: number;
    startIndex: number;
    label: string;
  };
  structureLines: Array<{
    price: number;
    startIndex: number;
    endIndex: number;
    label: string;
  }>;
  marketStructure: string;
  keyZones: string;
  technicalConfirmation: string;
  managementAdvice: string;
}

interface DerivInstrument {
  id: string;
  label: string;
  group: "VOLATILITY" | "BOOM_CRASH" | "STEP_JUMP" | "DERIV_FOREX_GOLD";
  pipStep: number;
  decimals: number;
  minLot: string;
}

const DERIV_INSTRUMENTS: DerivInstrument[] = [
  {
    id: "R_75",
    label: "Volatility 75 Index (V75)",
    group: "VOLATILITY",
    pipStep: 240.0,
    decimals: 2,
    minLot: "0.0001 / 0.001",
  },
  {
    id: "1HZ75V",
    label: "Volatility 75 (1s) Index",
    group: "VOLATILITY",
    pipStep: 2.8,
    decimals: 2,
    minLot: "0.005",
  },
  {
    id: "R_25",
    label: "Volatility 25 Index (V25)",
    group: "VOLATILITY",
    pipStep: 0.85,
    decimals: 3,
    minLot: "0.50",
  },
  {
    id: "1HZ25V",
    label: "Volatility 25 (1s) Index",
    group: "VOLATILITY",
    pipStep: 1.5,
    decimals: 2,
    minLot: "0.005",
  },
  {
    id: "R_50",
    label: "Volatility 50 Index (V50)",
    group: "VOLATILITY",
    pipStep: 0.14,
    decimals: 4,
    minLot: "0.001",
  },
  {
    id: "R_100",
    label: "Volatility 100 Index (V100)",
    group: "VOLATILITY",
    pipStep: 1.4,
    decimals: 2,
    minLot: "0.20",
  },
  {
    id: "1HZ100V",
    label: "Volatility 100 (1s) Index",
    group: "VOLATILITY",
    pipStep: 0.9,
    decimals: 2,
    minLot: "0.20",
  },
  {
    id: "R_10",
    label: "Volatility 10 Index (V10)",
    group: "VOLATILITY",
    pipStep: 1.1,
    decimals: 3,
    minLot: "0.20",
  },
  {
    id: "BOOM1000",
    label: "Boom 1000 Index",
    group: "BOOM_CRASH",
    pipStep: 3.2,
    decimals: 2,
    minLot: "0.20",
  },
  {
    id: "CRASH1000",
    label: "Crash 1000 Index",
    group: "BOOM_CRASH",
    pipStep: 2.9,
    decimals: 2,
    minLot: "0.20",
  },
  {
    id: "BOOM500",
    label: "Boom 500 Index",
    group: "BOOM_CRASH",
    pipStep: 2.4,
    decimals: 2,
    minLot: "0.20",
  },
  {
    id: "CRASH500",
    label: "Crash 500 Index",
    group: "BOOM_CRASH",
    pipStep: 2.3,
    decimals: 2,
    minLot: "0.20",
  },
  {
    id: "BOOM300N",
    label: "Boom 300 Index",
    group: "BOOM_CRASH",
    pipStep: 1.9,
    decimals: 2,
    minLot: "0.10",
  },
  {
    id: "CRASH300N",
    label: "Crash 300 Index",
    group: "BOOM_CRASH",
    pipStep: 1.8,
    decimals: 2,
    minLot: "0.05",
  },
  {
    id: "stpRNG",
    label: "Step Index 100",
    group: "STEP_JUMP",
    pipStep: 0.1,
    decimals: 1,
    minLot: "0.10",
  },
  {
    id: "JD75",
    label: "Jump 75 Index",
    group: "STEP_JUMP",
    pipStep: 22.0,
    decimals: 2,
    minLot: "0.01",
  },
  {
    id: "JD100",
    label: "Jump 100 Index",
    group: "STEP_JUMP",
    pipStep: 35.0,
    decimals: 2,
    minLot: "0.01",
  },
  {
    id: "frxXAUUSD",
    label: "XAU/USD · Or / Gold (Deriv MT5)",
    group: "DERIV_FOREX_GOLD",
    pipStep: 0.45,
    decimals: 2,
    minLot: "0.01",
  },
  {
    id: "frxEURUSD",
    label: "EUR/USD (Deriv MT5)",
    group: "DERIV_FOREX_GOLD",
    pipStep: 0.00015,
    decimals: 5,
    minLot: "0.01",
  },
  {
    id: "cryBTCUSD",
    label: "BTC/USD · Bitcoin (Deriv MT5)",
    group: "DERIV_FOREX_GOLD",
    pipStep: 25.0,
    decimals: 2,
    minLot: "0.01",
  },
];

// Official Deriv WebSocket v3 supported candle granularities (including M3 = 180s like TradingView)
const TIMEFRAMES = [
  { id: "M1", label: "M1", seconds: 60 },
  { id: "M2", label: "M2", seconds: 120 },
  { id: "M3", label: "M3", seconds: 180 },
  { id: "M5", label: "M5", seconds: 300 },
  { id: "M15", label: "M15", seconds: 900 },
  { id: "M30", label: "M30", seconds: 1800 },
  { id: "H1", label: "H1", seconds: 3600 },
  { id: "H4", label: "H4", seconds: 14400 },
];

const DERIV_WS_ENDPOINTS = [
  "wss://ws.derivws.com/websockets/v3",
  "wss://ws.binaryws.com/websockets/v3",
  "wss://green.derivws.com/websockets/v3",
];

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface LiveMarketTerminalProps {
  accountBalance: number;
  riskPercent: number;
}

export const LiveMarketTerminal: React.FC<LiveMarketTerminalProps> = ({
  accountBalance,
  riskPercent,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("R_25");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("M3");
  const [candles, setCandles] = useState<CandleBar[]>([]);
  const [liveTickQuote, setLiveTickQuote] = useState<number | null>(null);
  const [liveSetup, setLiveSetup] = useState<LiveSMCSetup | null>(null);
  const [showDrawings, setShowDrawings] = useState<boolean>(true);
  const [feedSource, setFeedSource] = useState<string>(
    "Connexion directe au serveur Deriv WebSocket v3..."
  );
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(true);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false);
  const [derivAccountInfo, setDerivAccountInfo] = useState<{
    loginid?: string;
    balance?: number;
    currency?: string;
  } | null>(null);

  // Deriv API Token & App ID configuration drawer
  const [showDerivConfig, setShowDerivConfig] = useState<boolean>(false);
  const [derivApiToken, setDerivApiToken] = useState<string>(() => {
    try {
      return localStorage.getItem("deriv_api_token_v1") || "";
    } catch {
      return "";
    }
  });
  const [derivAppId, setDerivAppId] = useState<string>(() => {
    try {
      return localStorage.getItem("deriv_app_id_v1") || "1089";
    } catch {
      return "1089";
    }
  });

  // Load any DERIV_API_TOKEN configured in .env on the server if localStorage is empty
  useEffect(() => {
    fetch("/api/deriv-config")
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.token && !localStorage.getItem("deriv_api_token_v1")) {
          setDerivApiToken(cfg.token);
        }
        if (cfg.appId && cfg.appId !== "1089" && !localStorage.getItem("deriv_app_id_v1")) {
          setDerivAppId(cfg.appId);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      id: "welcome-deriv-live",
      role: "assistant",
      content:
        "📡 **Flux Direct Deriv WebSocket v3 synchronisé (Prix exact TradingView / MT5).**\n\nLes prix affichés proviennent directement et sans altération des serveurs temps réel Deriv (`ticks_history` + `ticks`).\n\nChoisissez votre indice (ex: **Volatility 25 Index**, **Volatility 75**, **Boom 1000**) et votre unité de temps (**M1, M3, M5, M15, H1**), ou demandez-moi dans ce chat d'analyser et tracer le setup en direct.",
      timestamp: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [chatInput, setChatInput] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);
  const fallbackTimeoutRef = useRef<any>(null);
  const streamSessionIdRef = useRef<number>(0);
  const candlesRef = useRef<CandleBar[]>([]);
  candlesRef.current = candles;

  const currentInstrument =
    DERIV_INSTRUMENTS.find((i) => i.id === selectedSymbol) ||
    DERIV_INSTRUMENTS[0];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAnalyzingAI]);

  // Run AI analysis & trace setup on live Deriv candles
  const runLiveAIAnalysis = useCallback(
    async (
      customCandles?: CandleBar[],
      customPrompt?: string,
      silentAutoTrace = false,
      overrideSym?: string,
      overrideTf?: string
    ) => {
      const targetCandles = customCandles || candlesRef.current;
      if (!targetCandles || targetCandles.length < 10) return;

      const sym = overrideSym || selectedSymbol;
      const tf = overrideTf || selectedTimeframe;
      const inst =
        DERIV_INSTRUMENTS.find((i) => i.id === sym) || currentInstrument;

      if (!silentAutoTrace) {
        setIsAnalyzingAI(true);
      }

      try {
        const resp = await fetch("/api/analyze-live-market", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: sym,
            symbolLabel: inst.label,
            timeframe: tf,
            candles: targetCandles,
            userMessage:
              customPrompt ||
              `Analyse l'indice Deriv ${inst.label} (${sym}) en ${tf} en temps réel et trace le setup complet (Order Block, FVG, BOS, Entrée, SL, TP1, TP2) sur le graphique.`,
            chatHistory: chatMessages.slice(-6),
            accountBalance: derivAccountInfo?.balance ?? accountBalance,
            riskPercent,
            silentAutoTrace,
          }),
        });

        const data = await resp.json();
        if (data.liveSetup) {
          setLiveSetup(data.liveSetup);
          setShowDrawings(true);
        }

        if (!silentAutoTrace && data.reply) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: "assistant",
              content: data.reply,
              timestamp: new Date().toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
        }
      } catch {
        // silent fallback
      } finally {
        if (!silentAutoTrace) {
          setIsAnalyzingAI(false);
        }
      }
    },
    [
      selectedSymbol,
      selectedTimeframe,
      currentInstrument,
      chatMessages,
      accountBalance,
      derivAccountInfo,
      riskPercent,
    ]
  );

  // Connect DIRECTLY to Deriv WebSocket v3 FIRST so prices match TradingView/MT5 100%
  const connectDerivMarketStream = useCallback(
    (sym: string, tf: string, endpointIdx = 0) => {
      const sessionId = ++streamSessionIdRef.current;
      setIsLoadingCandles(true);
      setLiveTickQuote(null);

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      const tfObj = TIMEFRAMES.find((t) => t.id === tf) || TIMEFRAMES[2];
      const rawAppId = derivAppId.trim().replace(/^["']|["']$/g, "");
      // Ensure app_id is numeric (fallback to official 1089 if user accidentally typed non-digits)
      const validAppId = /^\d+$/.test(rawAppId) ? rawAppId : "1089";
      const cleanToken = derivApiToken.trim().replace(/^["']|["']$/g, "");

      const baseUrl =
        DERIV_WS_ENDPOINTS[endpointIdx] || DERIV_WS_ENDPOINTS[0];
      const wsUrl = `${baseUrl}?app_id=${validAppId}`;

      let receivedRealCandles = false;

      // Emergency fallback ONLY if all Deriv WebSocket endpoints are unreachable after 4.5s
      fallbackTimeoutRef.current = setTimeout(async () => {
        if (sessionId !== streamSessionIdRef.current || receivedRealCandles) {
          return;
        }
        if (endpointIdx + 1 < DERIV_WS_ENDPOINTS.length) {
          connectDerivMarketStream(sym, tf, endpointIdx + 1);
          return;
        }
        try {
          const resp = await fetch(
            `/api/market/candles?symbol=${encodeURIComponent(sym)}&granularity=${encodeURIComponent(tf)}`
          );
          const data = await resp.json();
          if (
            sessionId === streamSessionIdRef.current &&
            !receivedRealCandles &&
            Array.isArray(data.candles)
          ) {
            setCandles(data.candles);
            setIsLoadingCandles(false);
            setFeedSource("Mode Hors-Ligne (Simulateur de secours)");
            void runLiveAIAnalysis(data.candles, undefined, true, sym, tf);
          }
        } catch {
          setIsLoadingCandles(false);
        }
      }, 4500);

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (sessionId !== streamSessionIdRef.current) {
            ws.close();
            return;
          }

          // 1. ALWAYS subscribe to real-time candles FIRST so nothing blocks or delays real market prices!
          ws.send(
            JSON.stringify({
              ticks_history: sym,
              adjust_start_time: 1,
              count: 90,
              end: "latest",
              granularity: tfObj.seconds,
              style: "candles",
              subscribe: 1,
            })
          );

          // 2. Also subscribe to real-time tick quotes so every single 1s/2s tick updates immediately
          ws.send(
            JSON.stringify({
              ticks: sym,
              subscribe: 1,
            })
          );

          // Keep-alive ping every 25s
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ ping: 1 }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (sessionId !== streamSessionIdRef.current) return;
          try {
            const msg = JSON.parse(event.data);

            // Real Historical + Current Forming Candles from Deriv Server
            if (
              msg.candles &&
              Array.isArray(msg.candles) &&
              msg.candles.length > 5
            ) {
              receivedRealCandles = true;
              if (fallbackTimeoutRef.current) {
                clearTimeout(fallbackTimeoutRef.current);
                fallbackTimeoutRef.current = null;
              }

              const mapped: CandleBar[] = msg.candles.map((c: any) => ({
                time: Number(c.epoch),
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
              }));

              const latestClose = mapped[mapped.length - 1].close;
              setCandles(mapped);
              setLiveTickQuote(latestClose);
              setIsLoadingCandles(false);
              setFeedSource(
                `Deriv WebSocket Temps Réel Direct (${sym} · App ID ${validAppId})`
              );

              // Auto-trace SMC setup on the real Deriv candles
              void runLiveAIAnalysis(mapped, undefined, true, sym, tf);

              // 3. ONLY AFTER real candles are loaded, send authorize if user provided a Deriv API Token
              if (cleanToken) {
                ws.send(JSON.stringify({ authorize: cleanToken }));
              }
            }

            // Real-time OHLC candle stream update from Deriv
            if (msg.ohlc) {
              receivedRealCandles = true;
              const o = msg.ohlc;
              const liveBar: CandleBar = {
                time: Number(o.open_time),
                open: Number(o.open),
                high: Number(o.high),
                low: Number(o.low),
                close: Number(o.close),
              };
              setLiveTickQuote(liveBar.close);
              setCandles((prev) => {
                if (prev.length === 0) return [liveBar];
                const last = prev[prev.length - 1];
                if (
                  last.time === liveBar.time ||
                  Math.abs(last.time - liveBar.time) < tfObj.seconds
                ) {
                  return [...prev.slice(0, -1), liveBar];
                }
                if (liveBar.time > last.time) {
                  return [...prev.slice(1), liveBar];
                }
                return prev;
              });
            }

            // Real-time tick quote update (every 1s or 2s on Deriv)
            if (msg.tick && typeof msg.tick.quote !== "undefined") {
              const quote = Number(msg.tick.quote);
              const tickEpoch = Number(msg.tick.epoch);
              if (!isNaN(quote)) {
                setLiveTickQuote(quote);
                setCandles((prev) => {
                  if (prev.length === 0) return prev;
                  const last = prev[prev.length - 1];
                  const bucketStart =
                    Math.floor(tickEpoch / tfObj.seconds) * tfObj.seconds;
                  if (bucketStart > last.time) {
                    const newBar: CandleBar = {
                      time: bucketStart,
                      open: quote,
                      high: quote,
                      low: quote,
                      close: quote,
                    };
                    return [...prev.slice(1), newBar];
                  }
                  const updatedLast: CandleBar = {
                    ...last,
                    close: quote,
                    high: Math.max(last.high, quote),
                    low: Math.min(last.low, quote),
                  };
                  return [...prev.slice(0, -1), updatedLast];
                });
              }
            }

            // Account authorization response
            if (msg.authorize) {
              setDerivAccountInfo({
                loginid: msg.authorize.loginid,
                balance: Number(msg.authorize.balance),
                currency: msg.authorize.currency || "USD",
              });
              setFeedSource(
                `Deriv API v3 Temps Réel Authentifié (${msg.authorize.loginid})`
              );
            }
          } catch {
            // ignore parse error
          }
        };

        ws.onerror = () => {
          if (
            sessionId === streamSessionIdRef.current &&
            !receivedRealCandles &&
            endpointIdx + 1 < DERIV_WS_ENDPOINTS.length
          ) {
            connectDerivMarketStream(sym, tf, endpointIdx + 1);
          }
        };
      } catch {
        if (endpointIdx + 1 < DERIV_WS_ENDPOINTS.length) {
          connectDerivMarketStream(sym, tf, endpointIdx + 1);
        }
      }
    },
    [derivAppId, derivApiToken, runLiveAIAnalysis]
  );

  useEffect(() => {
    connectDerivMarketStream(selectedSymbol, selectedTimeframe, 0);
    return () => {
      streamSessionIdRef.current++;
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedSymbol, selectedTimeframe]);

  // Render High-DPI Deriv Live Candlestick Chart + SMC/ICT AI Setup Overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length < 5) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 1040;
    const height = 580;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const padLeft = 18;
    const padRight = 112;
    const padTop = 42;
    const padBottom = 36;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    ctx.fillStyle = "#090E17";
    ctx.fillRect(0, 0, width, height);

    let minP = Math.min(...candles.map((c) => c.low));
    let maxP = Math.max(...candles.map((c) => c.high));

    if (showDrawings && liveSetup) {
      const setupPrices = [
        liveSetup.entryPrice,
        liveSetup.stopLoss,
        liveSetup.takeProfit1,
        liveSetup.takeProfit2,
        liveSetup.orderBlock.topPrice,
        liveSetup.orderBlock.bottomPrice,
      ].filter((p) => typeof p === "number" && !isNaN(p));
      if (setupPrices.length > 0) {
        minP = Math.min(minP, ...setupPrices);
        maxP = Math.max(maxP, ...setupPrices);
      }
    }

    const span = Math.max(maxP - minP, 0.0001);
    const topPrice = maxP + span * 0.1;
    const bottomPrice = minP - span * 0.1;
    const totalPriceRange = Math.max(topPrice - bottomPrice, 0.0001);

    const priceToY = (p: number) =>
      padTop + ((topPrice - p) / totalPriceRange) * plotH;

    const indexToX = (idx: number) => {
      const totalSlots = candles.length + 12;
      return padLeft + ((idx + 0.5) / totalSlots) * plotW;
    };

    // Grid & Right Price Scale
    ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1;
    const gridSteps = 8;
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#64748B";

    for (let i = 0; i <= gridSteps; i++) {
      const ratio = i / gridSteps;
      const y = padTop + ratio * plotH;
      const pVal = topPrice - ratio * totalPriceRange;

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();

      ctx.fillText(
        pVal.toFixed(currentInstrument.decimals),
        padLeft + plotW + 8,
        y + 4
      );
    }

    ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
    ctx.beginPath();
    ctx.moveTo(padLeft + plotW, padTop);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    // Draw AI SMC / ICT Setups on Live Chart
    if (showDrawings && liveSetup) {
      const rightEdgeX = padLeft + plotW - 4;
      const lastCandleX = indexToX(candles.length - 1);

      // Order Block Box
      if (liveSetup.orderBlock) {
        const obX1 = indexToX(
          Math.max(
            0,
            Math.min(candles.length - 3, liveSetup.orderBlock.startIndex)
          )
        );
        const obYTop = priceToY(
          Math.max(
            liveSetup.orderBlock.topPrice,
            liveSetup.orderBlock.bottomPrice
          )
        );
        const obYBot = priceToY(
          Math.min(
            liveSetup.orderBlock.topPrice,
            liveSetup.orderBlock.bottomPrice
          )
        );
        const obH = Math.max(14, obYBot - obYTop);

        ctx.fillStyle =
          liveSetup.action === "BUY"
            ? "rgba(16, 185, 129, 0.16)"
            : "rgba(239, 68, 68, 0.16)";
        ctx.strokeStyle =
          liveSetup.action === "BUY"
            ? "rgba(16, 185, 129, 0.8)"
            : "rgba(239, 68, 68, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.fillRect(obX1, obYTop, rightEdgeX - obX1, obH);
        ctx.strokeRect(obX1, obYTop, rightEdgeX - obX1, obH);

        ctx.font = "bold 10px 'Inter', sans-serif";
        ctx.fillStyle = liveSetup.action === "BUY" ? "#34D399" : "#F87171";
        ctx.fillText(liveSetup.orderBlock.label, obX1 + 6, obYTop + 12);
      }

      // Fair Value Gap (FVG) Zone
      if (liveSetup.fvgZone) {
        const fvgX1 = indexToX(
          Math.max(
            0,
            Math.min(candles.length - 2, liveSetup.fvgZone.startIndex)
          )
        );
        const fvgYTop = priceToY(
          Math.max(liveSetup.fvgZone.topPrice, liveSetup.fvgZone.bottomPrice)
        );
        const fvgYBot = priceToY(
          Math.min(liveSetup.fvgZone.topPrice, liveSetup.fvgZone.bottomPrice)
        );
        const fvgH = Math.max(12, fvgYBot - fvgYTop);

        ctx.fillStyle = "rgba(56, 189, 248, 0.13)";
        ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
        ctx.setLineDash([4, 4]);
        ctx.fillRect(fvgX1, fvgYTop, rightEdgeX - fvgX1, fvgH);
        ctx.strokeRect(fvgX1, fvgYTop, rightEdgeX - fvgX1, fvgH);
        ctx.setLineDash([]);

        ctx.font = "bold 10px 'Inter', sans-serif";
        ctx.fillStyle = "#38BDF8";
        ctx.fillText(liveSetup.fvgZone.label, fvgX1 + 6, fvgYTop + 11);
      }

      // BOS / CHoCH Lines
      if (Array.isArray(liveSetup.structureLines)) {
        liveSetup.structureLines.forEach((line) => {
          const sx1 = indexToX(Math.max(0, line.startIndex));
          const sx2 = indexToX(Math.min(candles.length - 1, line.endIndex));
          const sy = priceToY(line.price);

          ctx.strokeStyle = "#F59E0B";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(sx1, sy);
          ctx.lineTo(sx2, sy);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = "bold 10px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#FBBF24";
          ctx.fillText(line.label, (sx1 + sx2) / 2 - 35, sy - 5);
        });
      }

      // Risk / Reward Position Projection Box
      const entryY = priceToY(liveSetup.entryPrice);
      const slY = priceToY(liveSetup.stopLoss);
      const tp1Y = priceToY(liveSetup.takeProfit1);
      const tp2Y = priceToY(liveSetup.takeProfit2);
      const boxStartX = Math.max(padLeft + plotW * 0.62, lastCandleX - 25);
      const boxW = rightEdgeX - boxStartX;

      const riskTop = Math.min(entryY, slY);
      const riskH = Math.max(4, Math.abs(slY - entryY));
      ctx.fillStyle = "rgba(239, 68, 68, 0.18)";
      ctx.fillRect(boxStartX, riskTop, boxW, riskH);

      const rewardTop = Math.min(entryY, tp2Y);
      const rewardH = Math.max(4, Math.abs(tp2Y - entryY));
      ctx.fillStyle = "rgba(22, 163, 74, 0.16)";
      ctx.fillRect(boxStartX, rewardTop, boxW, rewardH);

      const drawPriceLevel = (
        y: number,
        price: number,
        label: string,
        color: string,
        bgBadge: string,
        dashed = false
      ) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        if (dashed) ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(boxStartX - 35, y);
        ctx.lineTo(padLeft + plotW, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        const tagText = `${label} · ${price.toFixed(
          currentInstrument.decimals
        )}`;
        const textW = ctx.measureText(tagText).width + 12;
        ctx.fillStyle = bgBadge;
        ctx.fillRect(boxStartX + 4, y - 15, textW, 14);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(tagText, boxStartX + 10, y - 4);

        ctx.fillStyle = bgBadge;
        ctx.fillRect(padLeft + plotW + 2, y - 9, padRight - 6, 18);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillText(
          price.toFixed(currentInstrument.decimals),
          padLeft + plotW + 6,
          y + 3
        );
      };

      drawPriceLevel(
        slY,
        liveSetup.stopLoss,
        "STOP LOSS",
        "#EF4444",
        "#DC2626",
        false
      );
      drawPriceLevel(
        entryY,
        liveSetup.entryPrice,
        `${liveSetup.action} ENTRY`,
        "#3B82F6",
        "#2563EB",
        false
      );
      drawPriceLevel(
        tp1Y,
        liveSetup.takeProfit1,
        "TP 1 (BE)",
        "#10B981",
        "#059669",
        true
      );
      drawPriceLevel(
        tp2Y,
        liveSetup.takeProfit2,
        `TP 2 (${liveSetup.riskRewardRatio})`,
        "#22C55E",
        "#16A34A",
        false
      );
    }

    // EMA 50 (Orange) & EMA 20 (Cyan)
    const drawEMA = (period: number, color: string, lineWidth: number) => {
      const k = 2 / (period + 1);
      let ema = candles[0].close;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      candles.forEach((c, idx) => {
        ema = c.close * k + ema * (1 - k);
        const x = indexToX(idx);
        const y = priceToY(ema);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawEMA(50, "#F97316", 2.2);
    drawEMA(20, "#38BDF8", 1.3);

    // Candlesticks
    const candleSlotW = plotW / (candles.length + 12);
    const bodyW = Math.max(3, Math.min(11, candleSlotW * 0.68));

    candles.forEach((c, idx) => {
      const x = indexToX(idx);
      const isBull = c.close >= c.open;
      const color = isBull ? "#10B981" : "#EF4444";

      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);
      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      const topY = Math.min(openY, closeY);
      const bH = Math.max(2, Math.abs(closeY - openY));
      ctx.fillStyle = color;
      ctx.fillRect(x - bodyW / 2, topY, bodyW, bH);
    });

    // Current Live Price Line + Right-Axis Live Tag (matching TradingView Cyan/Green Tag)
    const lastCandle = candles[candles.length - 1];
    const currentLiveP = liveTickQuote ?? lastCandle.close;
    const lastY = priceToY(currentLiveP);

    ctx.strokeStyle = "#10B981";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(padLeft, lastY);
    ctx.lineTo(padLeft + plotW, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Right Axis Current Live Price Badge (exact TradingView style)
    ctx.fillStyle = "#059669";
    ctx.fillRect(padLeft + plotW + 2, lastY - 10, padRight - 6, 20);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillText(
      currentLiveP.toFixed(currentInstrument.decimals),
      padLeft + plotW + 6,
      lastY + 4
    );

    // Top-left chart watermark header + OHLC readout like TradingView
    ctx.font = "bold 12px 'Inter', sans-serif";
    ctx.fillStyle = "#F8FAFC";
    ctx.fillText(
      `${currentInstrument.label} (${selectedSymbol}) · ${selectedTimeframe}`,
      padLeft + 8,
      24
    );

    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#34D399";
    ctx.fillText(
      `O:${lastCandle.open.toFixed(currentInstrument.decimals)} H:${lastCandle.high.toFixed(currentInstrument.decimals)} L:${lastCandle.low.toFixed(currentInstrument.decimals)} C:${currentLiveP.toFixed(currentInstrument.decimals)}`,
      padLeft + 340,
      24
    );

    ctx.fillStyle = "#F97316";
    ctx.fillText("— EMA 50", padLeft + 710, 24);
    ctx.fillStyle = "#38BDF8";
    ctx.fillText("— EMA 20", padLeft + 780, 24);
  }, [
    candles,
    liveTickQuote,
    liveSetup,
    showDrawings,
    currentInstrument,
    selectedSymbol,
    selectedTimeframe,
  ]);

  // Handle user chat message & natural language Deriv symbol switching
  const handleSendChat = async (customText?: string) => {
    const text = (customText ?? chatInput).trim();
    if (!text || isAnalyzingAI) return;

    const userMsg: ChatMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!customText) setChatInput("");

    const upper = text.toUpperCase();
    let targetSym = selectedSymbol;
    let targetTf = selectedTimeframe;

    if (
      upper.includes("75 (1S)") ||
      upper.includes("V75 1S") ||
      upper.includes("1HZ75")
    ) {
      targetSym = "1HZ75V";
    } else if (upper.includes("V75") || upper.includes("VOLATILITY 75")) {
      targetSym = "R_75";
    } else if (
      upper.includes("25 (1S)") ||
      upper.includes("V25 1S") ||
      upper.includes("1HZ25")
    ) {
      targetSym = "1HZ25V";
    } else if (upper.includes("V25") || upper.includes("VOLATILITY 25")) {
      targetSym = "R_25";
    } else if (upper.includes("V50") || upper.includes("VOLATILITY 50")) {
      targetSym = "R_50";
    } else if (upper.includes("100 (1S)") || upper.includes("V100 1S")) {
      targetSym = "1HZ100V";
    } else if (upper.includes("V100") || upper.includes("VOLATILITY 100")) {
      targetSym = "R_100";
    } else if (upper.includes("V10") || upper.includes("VOLATILITY 10")) {
      targetSym = "R_10";
    } else if (upper.includes("BOOM 1000") || upper.includes("BOOM1000")) {
      targetSym = "BOOM1000";
    } else if (upper.includes("CRASH 1000") || upper.includes("CRASH1000")) {
      targetSym = "CRASH1000";
    } else if (upper.includes("BOOM 500") || upper.includes("BOOM500")) {
      targetSym = "BOOM500";
    } else if (upper.includes("CRASH 500") || upper.includes("CRASH500")) {
      targetSym = "CRASH500";
    } else if (upper.includes("BOOM 300") || upper.includes("BOOM300")) {
      targetSym = "BOOM300N";
    } else if (upper.includes("CRASH 300") || upper.includes("CRASH300")) {
      targetSym = "CRASH300N";
    } else if (upper.includes("STEP")) {
      targetSym = "stpRNG";
    } else if (upper.includes("JUMP 75") || upper.includes("JD75")) {
      targetSym = "JD75";
    } else if (upper.includes("JUMP 100") || upper.includes("JD100")) {
      targetSym = "JD100";
    } else if (
      upper.includes("XAU") ||
      upper.includes("GOLD") ||
      upper.includes(" OR ")
    ) {
      targetSym = "frxXAUUSD";
    } else if (upper.includes("EUR")) {
      targetSym = "frxEURUSD";
    } else if (upper.includes("BTC") || upper.includes("BITCOIN")) {
      targetSym = "cryBTCUSD";
    }

    if (upper.includes("M30") || upper.includes("30M")) targetTf = "M30";
    else if (upper.includes("M15") || upper.includes("15M")) targetTf = "M15";
    else if (upper.includes("M3") || upper.includes("3M")) targetTf = "M3";
    else if (upper.includes("M2") || upper.includes("2M")) targetTf = "M2";
    else if (upper.includes("M1") || upper.includes("1M")) targetTf = "M1";
    else if (upper.includes("M5") || upper.includes("5M")) targetTf = "M5";
    else if (upper.includes("H1") || upper.includes("1H")) targetTf = "H1";
    else if (upper.includes("H4") || upper.includes("4H")) targetTf = "H4";

    if (targetSym !== selectedSymbol || targetTf !== selectedTimeframe) {
      setSelectedSymbol(targetSym);
      setSelectedTimeframe(targetTf);
    }

    await runLiveAIAnalysis(
      candlesRef.current,
      text,
      false,
      targetSym,
      targetTf
    );
  };

  const handleSaveDerivConfig = () => {
    try {
      localStorage.setItem("deriv_api_token_v1", derivApiToken.trim());
      localStorage.setItem("deriv_app_id_v1", derivAppId.trim() || "1089");
    } catch {
      // ignore
    }
    setShowDerivConfig(false);
    connectDerivMarketStream(selectedSymbol, selectedTimeframe, 0);
  };

  const displayedLivePrice =
    liveTickQuote !== null
      ? liveTickQuote.toFixed(currentInstrument.decimals)
      : candles.length > 0
      ? candles[candles.length - 1].close.toFixed(currentInstrument.decimals)
      : "Connexion...";

  return (
    <div className="space-y-6">
      {/* Top Control Bar: Deriv Market Selector + Timeframe + Deriv API Config + Instant Trace */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Tick Price Pill */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[#0F172A] border border-emerald-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Prix Deriv Direct
              </span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {displayedLivePrice}
              </span>
            </div>
          </div>

          {/* Deriv Synthetic Index Selector */}
          <div className="flex flex-col">
            <label className="text-[11px] text-slate-400 mb-1">
              Indice Synthétique / Actif Deriv (WebSocket Temps Réel)
            </label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <optgroup label="Volatility Indices (Deriv)">
                {DERIV_INSTRUMENTS.filter((i) => i.group === "VOLATILITY").map(
                  (inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.label} · Lot min: {inst.minLot}
                    </option>
                  )
                )}
              </optgroup>
              <optgroup label="Boom & Crash Indices (Deriv)">
                {DERIV_INSTRUMENTS.filter((i) => i.group === "BOOM_CRASH").map(
                  (inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.label} · Lot min: {inst.minLot}
                    </option>
                  )
                )}
              </optgroup>
              <optgroup label="Step & Jump Indices (Deriv)">
                {DERIV_INSTRUMENTS.filter((i) => i.group === "STEP_JUMP").map(
                  (inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.label} · Lot min: {inst.minLot}
                    </option>
                  )
                )}
              </optgroup>
              <optgroup label="Or, Forex & Crypto (Deriv MT5)">
                {DERIV_INSTRUMENTS.filter(
                  (i) => i.group === "DERIV_FOREX_GOLD"
                ).map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Timeframe Selector (including M3 like TradingView) */}
          <div className="flex flex-col">
            <label className="text-[11px] text-slate-400 mb-1">
              Unité de Temps (TradingView / MT5)
            </label>
            <div className="flex items-center gap-1 bg-[#0F172A] p-1 rounded-lg border border-slate-800">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setSelectedTimeframe(tf.id)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                    selectedTimeframe === tf.id
                      ? "bg-emerald-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Controls: Deriv API Token Button, Toggle Tracings, Run AI Setup */}
        <div className="flex flex-wrap items-center gap-2.5">
          {derivAccountInfo?.loginid && (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {derivAccountInfo.loginid} · {derivAccountInfo.balance}{" "}
                {derivAccountInfo.currency}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowDrawings((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              showDrawings
                ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                : "bg-[#0F172A] border-slate-700 text-slate-400"
            }`}
          >
            {showDrawings ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            <span>{showDrawings ? "Tracés IA Visibles" : "Tracés Masqués"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDerivConfig((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#0F172A] border border-slate-700 text-slate-300 hover:border-slate-600 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {derivApiToken
                ? "Token API Deriv Connecté"
                : "Configurer API Deriv"}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              void runLiveAIAnalysis(
                candles,
                `Analyse complète de ${currentInstrument.label} en ${selectedTimeframe} maintenant et mets à jour tout le traçage (ENTRY, SL, TP1, TP2, Order Block, FVG, BOS) sur le graphique.`,
                false
              )
            }
            disabled={isAnalyzingAI || candles.length < 5}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#16A34A] hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {isAnalyzingAI
                ? "Analyse & Traçage..."
                : "Analyser & Tracer le Setup en Direct"}
            </span>
          </button>
        </div>
      </div>

      {/* Deriv API v3 Configuration Drawer */}
      {showDerivConfig && (
        <div className="bg-[#0F172A] border border-emerald-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Configuration API Deriv v3 (WebSocket Temps Réel & Token Compte Deriv)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Le flux temps réel Deriv utilise directement{" "}
                <code className="text-emerald-400">
                  wss://ws.derivws.com/websockets/v3
                </code>{" "}
                pour afficher exactement le même prix que TradingView et MT5.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">
                Token API Deriv (Optionnel — Read / Trade)
              </label>
              <input
                type="password"
                value={derivApiToken}
                onChange={(e) => setDerivApiToken(e.target.value)}
                placeholder="Ex: a1-xYz987... (ou dans .env : DERIV_API_TOKEN=...)"
                className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Deriv App ID (Défaut : 1089)
              </label>
              <input
                type="text"
                value={derivAppId}
                onChange={(e) => setDerivAppId(e.target.value)}
                placeholder="1089"
                className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleSaveDerivConfig}
                className="w-full px-4 py-2 bg-[#16A34A] hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Connecter API Deriv
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Split Workspace: Left 7 Cols Live Deriv Chart | Right 5 Cols Interactive AI Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7/12): Real-Time Deriv Candlestick Chart + Setup Levels */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-[#0F172A]/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="font-semibold">{currentInstrument.label}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-mono">{feedSource}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    connectDerivMarketStream(
                      selectedSymbol,
                      selectedTimeframe,
                      0
                    )
                  }
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isLoadingCandles ? "animate-spin" : ""
                    }`}
                  />
                  <span>Reconnecter Flux</span>
                </button>
              </div>
            </div>

            <div className="relative bg-[#090E17] w-full">
              {isLoadingCandles && candles.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090E17]/90 z-10 gap-2">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                  <span className="text-xs font-mono text-slate-300">
                    Synchronisation directe avec Deriv WebSocket ({selectedSymbol} · {selectedTimeframe})...
                  </span>
                </div>
              )}
              <canvas
                ref={canvasRef}
                className="w-full h-[420px] sm:h-[480px] block"
              />
            </div>

            {liveSetup && (
              <div className="p-4 bg-[#0F172A] border-t border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold ${
                        liveSetup.action === "BUY"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-red-500/20 text-red-400 border border-red-500/40"
                      }`}
                    >
                      {liveSetup.action === "BUY" ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      SETUP {liveSetup.action} TRACÉ EN DIRECT
                    </span>
                    <span className="text-xs text-slate-400">
                      R:R{" "}
                      <strong className="text-slate-200">
                        {liveSetup.riskRewardRatio}
                      </strong>{" "}
                      · Lot Deriv :{" "}
                      <strong className="text-emerald-400">
                        {liveSetup.recommendedLot}
                      </strong>
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    EMA 50: {liveSetup.ema50} · EMA 20: {liveSetup.ema20}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-[#1E293B] border border-blue-500/30">
                    <div className="text-[10px] uppercase text-blue-400 font-semibold">
                      Entrée (ENTRY)
                    </div>
                    <div className="text-sm font-mono font-bold text-slate-100 mt-0.5">
                      {liveSetup.entryPrice}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#1E293B] border border-red-500/30">
                    <div className="text-[10px] uppercase text-red-400 font-semibold">
                      Stop Loss (SL)
                    </div>
                    <div className="text-sm font-mono font-bold text-red-400 mt-0.5">
                      {liveSetup.stopLoss}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#1E293B] border border-emerald-500/30">
                    <div className="text-[10px] uppercase text-emerald-400 font-semibold">
                      Take Profit 1 (BE)
                    </div>
                    <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                      {liveSetup.takeProfit1}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#1E293B] border border-emerald-500/30">
                    <div className="text-[10px] uppercase text-emerald-400 font-semibold">
                      Take Profit 2
                    </div>
                    <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                      {liveSetup.takeProfit2}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5/12): Interactive Deriv Live Market AI Chat */}
        <div className="lg:col-span-5 bg-[#1E293B] border border-slate-800 rounded-xl flex flex-col h-[580px] sm:h-[635px] overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-800 bg-[#0F172A]/70 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-100">
                  Chat Deriv Synthetic AI · Analyse & Traçage Direct
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Discutez avec l'IA : elle analyse {currentInstrument.label} (
                {selectedTimeframe}) et trace le setup sur le graphique.
              </p>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-[#0F172A]/40 border-b border-slate-800 flex flex-wrap gap-1.5">
            {[
              "Analyse ce marché et trace le setup complet",
              "Analyse Volatility 25 en M3 et trace le setup",
              "Analyse Volatility 75 en M15 et trace le setup",
              "Où placer mon Stop Loss et TP1/TP2 ici ?",
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void handleSendChat(q)}
                disabled={isAnalyzingAI}
                className="text-[11px] px-2.5 py-1 rounded-md bg-[#0F172A] hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                  <span className="font-semibold">
                    {msg.role === "user" ? "VOUS" : "DERIV SYNTHETIC AI"}
                  </span>
                  <span>·</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div
                  className={`max-w-[94%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#16A34A] text-white font-medium"
                      : "bg-[#0F172A] text-slate-200 border border-slate-800 font-mono"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isAnalyzingAI && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-[#0F172A] border border-slate-800 rounded-xl px-3.5 py-2.5 w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>
                  Analyse des bougies Deriv {currentInstrument.label} (
                  {selectedTimeframe}) & traçage du setup...
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendChat();
            }}
            className="p-3 border-t border-slate-800 bg-[#0F172A]/90 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Demandez à l'IA d'analyser ${currentInstrument.label} ou un autre indice Deriv...`}
              className="flex-1 bg-[#1E293B] border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isAnalyzingAI || !chatInput.trim()}
              className="px-4 py-2.5 bg-[#16A34A] hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Analyser</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
