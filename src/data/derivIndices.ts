export interface DerivIndexSpec {
  id: string;
  symbol: string;
  name: string;
  category: "Volatility" | "Boom & Crash" | "Step & Jump" | "Range Break";
  minLotStandard: number;
  minLotDisplay: string;
  maxLot: number;
  pointValuePerLot: number; // USD value per 1.00 index point movement for 1.0 lot
  typicalPrice: number;
  typicalSLPoints: number;
  smcBehavior: string;
  riskAdvisory: string;
}

export interface ChartAnalysisResult {
  id: string;
  timestamp: string;
  imageUrl: string;
  asset: string;
  timeframe: string;
  marketStructure: string;
  keyZones: string;
  technicalConfirmation: string;
  action: "BUY" | "SELL";
  entryPrice: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  riskRewardRatio: string;
  recommendedLot: string;
  managementAdvice: string;
  smcConceptsDetected: string[];
  confidenceNote: string;
  formattedReport: string;
}

export const DERIV_INDICES_SPECS: DerivIndexSpec[] = [
  {
    id: "v75",
    symbol: "R_75",
    name: "Volatility 75 Index (V75)",
    category: "Volatility",
    minLotStandard: 0.001,
    minLotDisplay: "0.0001 / 0.001",
    maxLot: 50,
    pointValuePerLot: 1,
    typicalPrice: 425120.5,
    typicalSLPoints: 3320.5,
    smcBehavior: "Respect chirurgical des Order Blocks M15/H1, des Fair Value Gaps (FVG) et des Liquidity Sweeps sur anciens sommets/creux.",
    riskAdvisory: "Forte volatilité algorithmique. Toujours démarrer à 0.0001 ou 0.001 lot pour les comptes < 500 USD et sécuriser au Break-Even dès TP1.",
  },
  {
    id: "v50",
    symbol: "R_50",
    name: "Volatility 50 Index (V50)",
    category: "Volatility",
    minLotStandard: 0.001,
    minLotDisplay: "0.001 / 0.01",
    maxLot: 100,
    pointValuePerLot: 1,
    typicalPrice: 248.65,
    typicalSLPoints: 2.85,
    smcBehavior: "Structure de marché très propre en H1/M15. Les cassures de structure (BOS) après CHoCH offrent des mouvements directionnels soutenus.",
    riskAdvisory: "Lot minimum de 0.001 (ou 0.01 selon serveur MT5). Idéal pour le swing intraday SMC avec un ratio R:R ≥ 1:2.5.",
  },
  {
    id: "v100",
    symbol: "R_100",
    name: "Volatility 100 Index (V100)",
    category: "Volatility",
    minLotStandard: 0.2,
    minLotDisplay: "0.20 / 0.50",
    maxLot: 100,
    pointValuePerLot: 1,
    typicalPrice: 1842.4,
    typicalSLPoints: 18.5,
    smcBehavior: "Impulsions rapides générant de larges FVG. Attendre systématiquement un retest 50% (Equilibrium) ou l'Order Block extrême.",
    riskAdvisory: "Lot min 0.20 / 0.50 : exige une gestion stricte de la distance du Stop Loss avant l'exécution.",
  },
  {
    id: "v25",
    symbol: "R_25",
    name: "Volatility 25 Index (V25)",
    category: "Volatility",
    minLotStandard: 0.5,
    minLotDisplay: "0.50",
    maxLot: 200,
    pointValuePerLot: 1,
    typicalPrice: 2145.8,
    typicalSLPoints: 12.0,
    smcBehavior: "Faible bruit de marché, respect élevé des canaux institutionnels et des zones d'accumulation/distribution.",
    riskAdvisory: "Lot minimum 0.50. Convient parfaitement aux traders recherchant des structures Price Action stables.",
  },
  {
    id: "v10",
    symbol: "R_10",
    name: "Volatility 10 Index (V10)",
    category: "Volatility",
    minLotStandard: 0.3,
    minLotDisplay: "0.30 / 0.50",
    maxLot: 200,
    pointValuePerLot: 1,
    typicalPrice: 6412.3,
    typicalSLPoints: 15.0,
    smcBehavior: "Volatilité constante de 10%. Excellente précision sur les croisements EMA 50/200 et les rejets de supports/résistances.",
    riskAdvisory: "Lot minimum 0.30. Déplacer le Stop Loss à Break-Even (BE) dès que le prix clôture au-delà du premier FVG opposé.",
  },
  {
    id: "v150_1s",
    symbol: "1HZ150V",
    name: "Volatility 150 (1s) Index",
    category: "Volatility",
    minLotStandard: 0.01,
    minLotDisplay: "0.005 / 0.01",
    maxLot: 50,
    pointValuePerLot: 1,
    typicalPrice: 892.4,
    typicalSLPoints: 14.2,
    smcBehavior: "Génération de ticks chaque seconde (1s). Balayages de liquidité (Liquidity Sweeps) rapides suivis de retournements en V (CHoCH).",
    riskAdvisory: "Attendre la clôture complète de la bougie M5/M15 pour confirmer le rejet de l'Order Block.",
  },
  {
    id: "v250_1s",
    symbol: "1HZ250V",
    name: "Volatility 250 (1s) Index",
    category: "Volatility",
    minLotStandard: 0.005,
    minLotDisplay: "0.005",
    maxLot: 25,
    pointValuePerLot: 1,
    typicalPrice: 4120.0,
    typicalSLPoints: 45.0,
    smcBehavior: "Indice ultra-rapide 1s. Privilégier les unités M15/H1 pour filtrer les mèches de chasse aux stops.",
    riskAdvisory: "Utiliser exclusivement le lot minimum 0.005 lors des phases d'expansion haute volatilité.",
  },
  {
    id: "boom1000",
    symbol: "BOOM1000",
    name: "Boom 1000 Index",
    category: "Boom & Crash",
    minLotStandard: 0.2,
    minLotDisplay: "0.20",
    maxLot: 50,
    pointValuePerLot: 1,
    typicalPrice: 13845.2,
    typicalSLPoints: 24.5,
    smcBehavior: "Spikes haussiers algorithmiques (1 spike moyen tous les 1000 ticks). Les Order Blocks haussiers M15/H1 déclenchent des séries de spikes.",
    riskAdvisory: "Lot min = 0.20. Privilégier les achats (BUY) sur Order Block haussier + FVG pour capter les spikes explosifs.",
  },
  {
    id: "crash1000",
    symbol: "CRASH1000",
    name: "Crash 1000 Index",
    category: "Boom & Crash",
    minLotStandard: 0.2,
    minLotDisplay: "0.20",
    maxLot: 50,
    pointValuePerLot: 1,
    typicalPrice: 6782.9,
    typicalSLPoints: 22.0,
    smcBehavior: "Chutes algorithmiques (drops) tous les ~1000 ticks. Les Supply Zones / Order Blocks baissiers provoquent des cascades de bougies rouges.",
    riskAdvisory: "Lot min = 0.20. Privilégier les ventes (SELL) sous résistance institutionnelle ou après un Liquidity Sweep (BSL).",
  },
  {
    id: "boom500",
    symbol: "BOOM500",
    name: "Boom 500 Index",
    category: "Boom & Crash",
    minLotStandard: 0.2,
    minLotDisplay: "0.20",
    maxLot: 50,
    pointValuePerLot: 1,
    typicalPrice: 4612.5,
    typicalSLPoints: 18.0,
    smcBehavior: "Fréquence de spikes deux fois supérieure au Boom 1000. Forte réactivité sur l'OTE (Optimal Trade Entry 61.8% - 78.6% Fibonacci).",
    riskAdvisory: "Lot min = 0.20. Sécuriser partiellement dès le premier double spike haussier (TP1).",
  },
  {
    id: "crash500",
    symbol: "CRASH500",
    name: "Crash 500 Index",
    category: "Boom & Crash",
    minLotStandard: 0.2,
    minLotDisplay: "0.20",
    maxLot: 50,
    pointValuePerLot: 1,
    typicalPrice: 3918.4,
    typicalSLPoints: 16.5,
    smcBehavior: "Drops fréquents sur rejets de moyennes mobiles (EMA 50/200) et Bearish Order Blocks en M5/M15.",
    riskAdvisory: "Lot min = 0.20. Ne pas maintenir une position BUY contre un Order Block H1 baissier.",
  },
  {
    id: "step100",
    symbol: "stpRNG",
    name: "Step Index",
    category: "Step & Jump",
    minLotStandard: 0.1,
    minLotDisplay: "0.10",
    maxLot: 50,
    pointValuePerLot: 10,
    typicalPrice: 8492.3,
    typicalSLPoints: 4.5,
    smcBehavior: "Mouvements symétriques par pas de 0.1 point. Respect exceptionnel de la structure SMC (BOS/CHoCH) et des niveaux psychologiques.",
    riskAdvisory: "Lot min = 0.10 (1 point = 1.00 USD à 0.10 lot). Un Stop Loss de 5 points représente 5.00 USD de risque à 0.10 lot.",
  },
  {
    id: "jump75",
    symbol: "JD75",
    name: "Jump 75 Index",
    category: "Step & Jump",
    minLotStandard: 0.01,
    minLotDisplay: "0.01",
    maxLot: 25,
    pointValuePerLot: 1,
    typicalPrice: 38450.0,
    typicalSLPoints: 280.0,
    smcBehavior: "Combine une volatilité de 75% avec des sauts (jumps) directionnels en moyenne toutes les 20 minutes sur les zones de liquidité.",
    riskAdvisory: "Lot min = 0.01. Toujours placer le SL derrière le dernier Swing High/Low structurel.",
  },
];

export interface SampleChartPreset {
  id: string;
  label: string;
  asset: string;
  timeframe: string;
  setupType: "BUY" | "SELL";
  subtitle: string;
  precomputedAnalysis: Omit<ChartAnalysisResult, "id" | "timestamp" | "imageUrl">;
}

export const SAMPLE_CHART_PRESETS: SampleChartPreset[] = [
  {
    id: "v75_m15_buy",
    label: "Volatility 75 (M15) — Setup SMC BUY",
    asset: "Volatility 75 Index",
    timeframe: "M15",
    setupType: "BUY",
    subtitle: "CHoCH Haussier + Retest Order Block M15 & FVG",
    precomputedAnalysis: {
      asset: "Volatility 75 Index (V75)",
      timeframe: "M15",
      marketStructure:
        "Tendance haussière confirmée après un Liquidity Sweep (SSL) à 421 400.00 suivi d'un Change of Character (CHoCH) impulsif et d'une cassure de structure (BOS) à 427 800.00.",
      keyZones:
        "Bullish Order Block M15 [423 850.00 – 425 120.50] aligné avec un Fair Value Gap (FVG) non comblé · Support majeur à 421 800.00 · Liquidité externe (BSL) à 436 900.00.",
      technicalConfirmation:
        "Rejet franc sur le Bullish Order Block M15 avec mèche d'absorption haussière, prix maintenu au-dessus de l'EMA 50 et RSI (14) en rebond sur la zone 48.",
      action: "BUY",
      entryPrice: "425120.50",
      stopLoss: "421800.00",
      takeProfit1: "430500.00",
      takeProfit2: "436900.00",
      riskRewardRatio: "1:3.55",
      recommendedLot: "0.001 (ou 0.0001 pour micro-capital < 150$)",
      managementAdvice:
        "Encaisser 50% de la position au TP1 (430 500.00) et déplacer immédiatement le Stop Loss au point d'entrée (Break-Even / BE) pour laisser courir vers la liquidité BSL au TP2.",
      smcConceptsDetected: [
        "Liquidity Sweep (SSL)",
        "CHoCH + BOS Haussier",
        "Bullish Order Block M15",
        "Fair Value Gap (FVG)",
      ],
      confidenceNote:
        "Confluence institutionnelle maximale : balayage SSL + déplacement impulsif + retest chirurgical OB/FVG au-dessus de l'EMA 50.",
      formattedReport: `📊 ANALYSE DU GRAPHIQUE : Volatility 75 Index (V75) (M15)

Structure du marché : Tendance haussière confirmée après un Liquidity Sweep (SSL) à 421 400.00 suivi d'un Change of Character (CHoCH) impulsif et d'une cassure de structure (BOS) à 427 800.00.

Zones clés identifiées : Bullish Order Block M15 [423 850.00 – 425 120.50] aligné avec un Fair Value Gap (FVG) non comblé · Support majeur à 421 800.00 · Liquidité externe (BSL) à 436 900.00.

Confirmation technique : Rejet franc sur le Bullish Order Block M15 avec mèche d'absorption haussière, prix maintenu au-dessus de l'EMA 50 et RSI (14) en rebond sur la zone 48.

🎯 PLAN DE TRADING RECOMMANDE :

Action : BUY

Entrée (ENTRY) : 425120.50

Stop Loss (SL) : 421800.00 (Rouge)

Take Profit 1 (TP1) : 430500.00 (Vert)

Take Profit 2 (TP2) : 436900.00 (Vert)

Ratio Risque/Rendement : 1:3.55

⚠️ GESTION DU RISQUE & CONSEILS :

Lot recommandé : 0.001 (ou 0.0001 pour micro-capital < 150$)

Consigne : Encaisser 50% de la position au TP1 (430 500.00) et déplacer immédiatement le Stop Loss au point d'entrée (Break-Even / BE) pour laisser courir vers la liquidité BSL au TP2.`,
    },
  },
  {
    id: "boom1000_m5_buy",
    label: "Boom 1000 (M5) — Chasse aux Spikes OB",
    asset: "Boom 1000 Index",
    timeframe: "M5",
    setupType: "BUY",
    subtitle: "Retracement sur Demand Zone M15 + OTE 70.5%",
    precomputedAnalysis: {
      asset: "Boom 1000 Index",
      timeframe: "M5",
      marketStructure:
        "Structure de fond haussière (Higher Highs / Higher Lows) avec retracement lent algorithmique vers la zone Discount (sous les 50% d'équilibre du dernier mouvement impulsif).",
      keyZones:
        "Order Block Haussier de base de spike [13 838.00 – 13 845.20] · Zone OTE ICT (70.5% Fib) · Résistance intermédiaire à 13 885.00 · Sommet de liquidité à 13 930.00.",
      technicalConfirmation:
        "Épuisement des micro-bougies baissières (ticks) à l'entrée de l'Order Block + divergence haussière cachée sur le RSI (14) en zone de survente (28).",
      action: "BUY",
      entryPrice: "13845.20",
      stopLoss: "13820.70",
      takeProfit1: "13885.00",
      takeProfit2: "13930.00",
      riskRewardRatio: "1:3.46",
      recommendedLot: "0.20 (Lot minimum réglementaire Boom 1000)",
      managementAdvice:
        "Passer le Stop Loss à Break-Even (BE) dès le premier spike haussier atteignant le TP1 (13 885.00). Ne jamais élargir le SL sous l'Order Block.",
      smcConceptsDetected: [
        "Spike Base Order Block",
        "Discount Zone (OTE 70.5%)",
        "RSI Oversold Confluence",
        "BOS Haussier Précédent",
      ],
      confidenceNote:
        "Configuration classique de réaction algorithmique Boom 1000 sur base d'Order Block non mitigé.",
      formattedReport: `📊 ANALYSE DU GRAPHIQUE : Boom 1000 Index (M5)

Structure du marché : Structure de fond haussière (Higher Highs / Higher Lows) avec retracement lent algorithmique vers la zone Discount (sous les 50% d'équilibre du dernier mouvement impulsif).

Zones clés identifiées : Order Block Haussier de base de spike [13 838.00 – 13 845.20] · Zone OTE ICT (70.5% Fib) · Résistance intermédiaire à 13 885.00 · Sommet de liquidité à 13 930.00.

Confirmation technique : Épuisement des micro-bougies baissières (ticks) à l'entrée de l'Order Block + divergence haussière cachée sur le RSI (14) en zone de survente (28).

🎯 PLAN DE TRADING RECOMMANDE :

Action : BUY

Entrée (ENTRY) : 13845.20

Stop Loss (SL) : 13820.70 (Rouge)

Take Profit 1 (TP1) : 13885.00 (Vert)

Take Profit 2 (TP2) : 13930.00 (Vert)

Ratio Risque/Rendement : 1:3.46

⚠️ GESTION DU RISQUE & CONSEILS :

Lot recommandé : 0.20 (Lot minimum réglementaire Boom 1000)

Consigne : Passer le Stop Loss à Break-Even (BE) dès le premier spike haussier atteignant le TP1 (13 885.00). Ne jamais élargir le SL sous l'Order Block.`,
    },
  },
  {
    id: "v50_h1_sell",
    label: "Volatility 50 (H1) — Setup SMC SELL",
    asset: "Volatility 50 Index",
    timeframe: "H1",
    setupType: "SELL",
    subtitle: "BSL Liquidity Sweep + Bearish Order Block H1",
    precomputedAnalysis: {
      asset: "Volatility 50 Index (V50)",
      timeframe: "H1",
      marketStructure:
        "Retournement baissier majeur (CHoCH H1) après prise de liquidité Buy-Side (BSL Sweep) au-dessus du double sommet à 250.80, suivi d'un Break of Structure (BOS) baissier sous 247.10.",
      keyZones:
        "Bearish Order Block H1 [248.65 – 249.90] · Fair Value Gap (FVG) baissier [247.40 – 248.65] · Support intermédiaire TP1 à 244.20 · Pool de liquidité SSL TP2 à 239.80.",
      technicalConfirmation:
        "Prix sous l'EMA 200 H1 + bougie Englobante Baissière (Bearish Engulfing) sur le retest du Bearish Order Block à 248.65.",
      action: "SELL",
      entryPrice: "248.65",
      stopLoss: "251.50",
      takeProfit1: "244.20",
      takeProfit2: "239.80",
      riskRewardRatio: "1:3.11",
      recommendedLot: "0.001 / 0.01",
      managementAdvice:
        "Sécuriser la position au Break-Even (BE) dès l'atteinte du TP1 (244.20) et laisser le solde viser le pool de liquidité Sell-Side (SSL) à 239.80.",
      smcConceptsDetected: [
        "Buy-Side Liquidity Sweep (BSL)",
        "CHoCH Baissier H1",
        "Bearish Order Block",
        "Rejet EMA 200",
      ],
      confidenceNote:
        "Distribution institutionnelle validée par le balayage BSL suivi d'un déplacement baissier net avec FVG.",
      formattedReport: `📊 ANALYSE DU GRAPHIQUE : Volatility 50 Index (V50) (H1)

Structure du marché : Retournement baissier majeur (CHoCH H1) après prise de liquidité Buy-Side (BSL Sweep) au-dessus du double sommet à 250.80, suivi d'un Break of Structure (BOS) baissier sous 247.10.

Zones clés identifiées : Bearish Order Block H1 [248.65 – 249.90] · Fair Value Gap (FVG) baissier [247.40 – 248.65] · Support intermédiaire TP1 à 244.20 · Pool de liquidité SSL TP2 à 239.80.

Confirmation technique : Prix sous l'EMA 200 H1 + bougie Englobante Baissière (Bearish Engulfing) sur le retest du Bearish Order Block à 248.65.

🎯 PLAN DE TRADING RECOMMANDE :

Action : SELL

Entrée (ENTRY) : 248.65

Stop Loss (SL) : 251.50 (Rouge)

Take Profit 1 (TP1) : 244.20 (Vert)

Take Profit 2 (TP2) : 239.80 (Vert)

Ratio Risque/Rendement : 1:3.11

⚠️ GESTION DU RISQUE & CONSEILS :

Lot recommandé : 0.001 / 0.01

Consigne : Sécuriser la position au Break-Even (BE) dès l'atteinte du TP1 (244.20) et laisser le solde viser le pool de liquidité Sell-Side (SSL) à 239.80.`,
    },
  },
  {
    id: "crash1000_m15_sell",
    label: "Crash 1000 (M15) — Supply Zone Drop",
    asset: "Crash 1000 Index",
    timeframe: "M15",
    setupType: "SELL",
    subtitle: "Mitigation Bearish OB + Croisement EMA Baissier",
    precomputedAnalysis: {
      asset: "Crash 1000 Index",
      timeframe: "M15",
      marketStructure:
        "Tendance baissière dominante (Lower Highs / Lower Lows). Le mouvement ascendant lent des ticks vient combler le Fair Value Gap M15 sous le Bearish Order Block.",
      keyZones:
        "Bearish Order Block M15 [6782.90 – 6798.50] · Résistance dynamique EMA 50 · Support TP1 à 6740.00 · Support majeur TP2 à 6695.00.",
      technicalConfirmation:
        "Rejet sous la moyenne mobile EMA 50 + premier drop baissier de confirmation cassant la micro-ligne de tendance ascendante.",
      action: "SELL",
      entryPrice: "6782.90",
      stopLoss: "6804.90",
      takeProfit1: "6740.00",
      takeProfit2: "6695.00",
      riskRewardRatio: "1:4.00",
      recommendedLot: "0.20",
      managementAdvice:
        "Déplacer le Stop Loss à Break-Even (BE) dès l'atteinte du TP1 (6740.00) pour protéger le capital contre les phases de rebond lent.",
      smcConceptsDetected: [
        "Bearish Order Block M15",
        "FVG Mitigation",
        "Trendline Breakdown",
        "EMA 50 Dynamic Resistance",
      ],
      confidenceNote:
        "Zone de distribution institutionnelle à haute probabilité de drops en cascade sur Crash 1000.",
      formattedReport: `📊 ANALYSE DU GRAPHIQUE : Crash 1000 Index (M15)

Structure du marché : Tendance baissière dominante (Lower Highs / Lower Lows). Le mouvement ascendant lent des ticks vient combler le Fair Value Gap M15 sous le Bearish Order Block.

Zones clés identifiées : Bearish Order Block M15 [6782.90 – 6798.50] · Résistance dynamique EMA 50 · Support TP1 à 6740.00 · Support majeur TP2 à 6695.00.

Confirmation technique : Rejet sous la moyenne mobile EMA 50 + premier drop baissier de confirmation cassant la micro-ligne de tendance ascendante.

🎯 PLAN DE TRADING RECOMMANDE :

Action : SELL

Entrée (ENTRY) : 6782.90

Stop Loss (SL) : 6804.90 (Rouge)

Take Profit 1 (TP1) : 6740.00 (Vert)

Take Profit 2 (TP2) : 6695.00 (Vert)

Ratio Risque/Rendement : 1:4.00

⚠️ GESTION DU RISQUE & CONSEILS :

Lot recommandé : 0.20

Consigne : Déplacer le Stop Loss à Break-Even (BE) dès l'atteinte du TP1 (6740.00) pour protéger le capital contre les phases de rebond lent.`,
    },
  },
];

/**
 * Generates a realistic high-resolution MT5 / TradingView synthetic index chart image (data URL)
 * complete with candlesticks, Order Blocks, FVG, BOS/CHoCH annotations, EMA 50, RSI sub-window, and price axis
 * so Vision AI can read and analyze it or the user can inspect it immediately.
 */
export function generateSyntheticChartImage(presetId: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 760;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const preset =
    SAMPLE_CHART_PRESETS.find((p) => p.id === presetId) || SAMPLE_CHART_PRESETS[0];
  const isBuy = preset.setupType === "BUY";

  // Dark MT5 / TradingView institutional background
  ctx.fillStyle = "#0B1120";
  ctx.fillRect(0, 0, 1280, 760);

  const chartLeft = 40;
  const chartTop = 58;
  const chartRight = 1145;
  const chartBottom = 565;
  const rsiTop = 590;
  const rsiBottom = 720;

  // Subtle price grid
  ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const y = chartTop + ((chartBottom - chartTop) / 8) * i;
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();
  }
  for (let i = 0; i <= 12; i++) {
    const x = chartLeft + ((chartRight - chartLeft) / 12) * i;
    ctx.beginPath();
    ctx.moveTo(x, chartTop);
    ctx.lineTo(x, rsiBottom);
    ctx.stroke();
  }

  // Right price axis separator
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.beginPath();
  ctx.moveTo(chartRight, chartTop);
  ctx.lineTo(chartRight, rsiBottom);
  ctx.stroke();

  // Parse price range from preset
  const entry = parseFloat(preset.precomputedAnalysis.entryPrice);
  const sl = parseFloat(preset.precomputedAnalysis.stopLoss);
  const tp1 = parseFloat(preset.precomputedAnalysis.takeProfit1);
  const tp2 = parseFloat(preset.precomputedAnalysis.takeProfit2);

  const allPrices = [entry, sl, tp1, tp2];
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const pad = (maxP - minP) * 0.18;
  const priceHigh = maxP + pad;
  const priceLow = minP - pad;

  const priceToY = (p: number) => {
    const ratio = (priceHigh - p) / (priceHigh - priceLow);
    return chartTop + ratio * (chartBottom - chartTop);
  };

  // Draw right-side price scale labels
  ctx.fillStyle = "#94A3B8";
  ctx.font = "12px 'JetBrains Mono', monospace";
  const decimals = entry > 10000 ? 2 : 2;
  for (let i = 0; i <= 8; i++) {
    const p = priceHigh - ((priceHigh - priceLow) / 8) * i;
    const y = chartTop + ((chartBottom - chartTop) / 8) * i;
    ctx.fillText(p.toFixed(decimals), chartRight + 10, y + 4);
  }

  // Draw SMC Order Block & FVG shaded zones
  const yEntry = priceToY(entry);
  const ySL = priceToY(sl);
  const yTP1 = priceToY(tp1);
  const yTP2 = priceToY(tp2);

  // Order Block Box
  const obTop = Math.min(yEntry, (yEntry + ySL) / 2);
  const obHeight = Math.abs(ySL - yEntry) * 0.58;
  ctx.fillStyle = isBuy
    ? "rgba(16, 185, 129, 0.13)"
    : "rgba(239, 68, 68, 0.13)";
  ctx.strokeStyle = isBuy
    ? "rgba(16, 185, 129, 0.45)"
    : "rgba(239, 68, 68, 0.45)";
  ctx.lineWidth = 1.5;
  const obStartY = isBuy ? yEntry - 6 : yEntry - obHeight + 6;
  ctx.fillRect(290, obStartY, chartRight - 290, obHeight);
  ctx.strokeRect(290, obStartY, chartRight - 290, obHeight);

  ctx.fillStyle = isBuy ? "#34D399" : "#F87171";
  ctx.font = "600 12px 'JetBrains Mono', monospace";
  ctx.fillText(
    isBuy
      ? `BULLISH ORDER BLOCK (${preset.timeframe}) + FVG ZONE`
      : `BEARISH ORDER BLOCK (${preset.timeframe}) + SUPPLY ZONE`,
    305,
    obStartY + 18
  );

  // Fair Value Gap (FVG) highlight box
  const fvgY = isBuy ? yEntry - 42 : yEntry + 12;
  ctx.fillStyle = "rgba(56, 189, 248, 0.10)";
  ctx.fillRect(580, fvgY, 540, 28);
  ctx.fillStyle = "#38BDF8";
  ctx.font = "500 11px 'JetBrains Mono', monospace";
  ctx.fillText("FVG (Fair Value Gap - Imbalance)", 592, fvgY + 18);

  // Generate 46 deterministic candlesticks forming a clear SMC structure (Sweep -> CHoCH -> BOS -> Retest Entry)
  const numCandles = 46;
  const candleSpacing = (chartRight - chartLeft - 80) / numCandles;

  // Normalized curve (0 = bottom, 1 = top)
  const normCurve: number[] = [];
  for (let i = 0; i < numCandles; i++) {
    const t = i / (numCandles - 1);
    let val = 0.5;
    if (isBuy) {
      if (t < 0.25) {
        // Initial descent into liquidity sweep
        val = 0.48 - t * 1.1;
      } else if (t < 0.55) {
        // Impulsive displacement up (CHoCH + BOS)
        val = 0.20 + (t - 0.25) * 1.95;
      } else if (t < 0.85) {
        // Controlled pullback into Order Block (Entry)
        val = 0.78 - (t - 0.55) * 1.42;
      } else {
        // Bullish rejection from OB
        val = 0.35 + (t - 0.85) * 1.15;
      }
    } else {
      if (t < 0.25) {
        // Rally into BSL liquidity sweep
        val = 0.52 + t * 1.1;
      } else if (t < 0.55) {
        // Impulsive displacement down (CHoCH + BOS)
        val = 0.80 - (t - 0.25) * 1.95;
      } else if (t < 0.85) {
        // Controlled pullback up into Bearish OB (Entry)
        val = 0.22 + (t - 0.55) * 1.42;
      } else {
        // Bearish rejection from OB
        val = 0.65 - (t - 0.85) * 1.15;
      }
    }
    normCurve.push(val);
  }

  const emaPoints: { x: number; y: number }[] = [];

  for (let i = 0; i < numCandles; i++) {
    const x = chartLeft + 35 + i * candleSpacing;
    const prevNorm = i > 0 ? normCurve[i - 1] : normCurve[i] - 0.02;
    const currNorm = normCurve[i];

    // Add deterministic wave modulation
    const wave = Math.sin(i * 1.7) * 0.028;
    const openNorm = prevNorm + wave * 0.5;
    const closeNorm = currNorm + wave;
    const highNorm = Math.max(openNorm, closeNorm) + 0.032 + (i === 11 ? 0.045 : 0);
    const lowNorm = Math.min(openNorm, closeNorm) - 0.032 - (i === 11 ? 0.045 : 0);

    const openY = chartBottom - openNorm * (chartBottom - chartTop);
    const closeY = chartBottom - closeNorm * (chartBottom - chartTop);
    const highY = chartBottom - highNorm * (chartBottom - chartTop);
    const lowY = chartBottom - lowNorm * (chartBottom - chartTop);

    const bullish = closeY <= openY;
    ctx.strokeStyle = bullish ? "#10B981" : "#EF4444";
    ctx.fillStyle = bullish ? "#10B981" : "#EF4444";
    ctx.lineWidth = 1.5;

    // Wick
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    // Body
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(Math.abs(closeY - openY), 3);
    ctx.fillRect(x - 5, bodyTop, 10, bodyHeight);

    // Smooth EMA 50 line
    const emaY = (openY + closeY) / 2 + (isBuy ? 18 : -18);
    emaPoints.push({ x, y: emaY });
  }

  // Draw EMA 50 line
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 2;
  ctx.beginPath();
  emaPoints.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.stroke();

  // Structural SMC annotations (Liquidity Sweep, CHoCH, BOS)
  ctx.strokeStyle = "#94A3B8";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  const bosY = isBuy ? chartTop + 140 : chartBottom - 140;
  ctx.moveTo(310, bosY);
  ctx.lineTo(680, bosY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#E2E8F0";
  ctx.font = "600 12px 'JetBrains Mono', monospace";
  ctx.fillText(isBuy ? "BOS / CHoCH HAUSSIER" : "BOS / CHoCH BAISSIER", 440, bosY - 8);

  // Entry, SL, TP1, TP2 Horizontal Price Lines on right side of chart
  const drawLevelLine = (
    y: number,
    price: number,
    label: string,
    color: string,
    bgTag: string
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(740, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tag on chart
    ctx.fillStyle = bgTag;
    ctx.fillRect(chartRight + 2, y - 10, 130, 20);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 11px 'JetBrains Mono', monospace";
    ctx.fillText(`${label} ${price.toFixed(decimals)}`, chartRight + 8, y + 4);
  };

  drawLevelLine(yEntry, entry, "ENTRY", "#38BDF8", "#0284C7");
  drawLevelLine(ySL, sl, "SL", "#EF4444", "#DC2626");
  drawLevelLine(yTP1, tp1, "TP1", "#10B981", "#16A34A");
  drawLevelLine(yTP2, tp2, "TP2", "#10B981", "#15803D");

  // RSI (14) Sub-window
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.beginPath();
  ctx.moveTo(chartLeft, rsiTop);
  ctx.lineTo(chartRight, rsiTop);
  ctx.stroke();

  ctx.fillStyle = "#94A3B8";
  ctx.font = "600 11px 'JetBrains Mono', monospace";
  ctx.fillText("RSI (14, Close) — EMA 50 Confluence", chartLeft + 10, rsiTop + 18);

  ctx.strokeStyle = "#8B5CF6";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < numCandles; i++) {
    const x = chartLeft + 35 + i * candleSpacing;
    const rsiVal = normCurve[i];
    const y = rsiBottom - 15 - rsiVal * (rsiBottom - rsiTop - 35);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Top MT5 / TradingView Header Bar inside screenshot
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(0, 0, 1280, 46);
  ctx.fillStyle = "#F8FAFC";
  ctx.font = "700 15px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(
    `DERIV MT5  ·  ${preset.asset}  ·  ${preset.timeframe}  ·  SMC / ICT Institutional Chart`,
    24,
    29
  );

  ctx.fillStyle = isBuy ? "#34D399" : "#F87171";
  ctx.font = "600 13px 'JetBrains Mono', monospace";
  ctx.fillText(
    `PRIX ACTUEL: ${entry.toFixed(decimals)}`,
    chartRight - 190,
    29
  );

  return canvas.toDataURL("image/png");
}
