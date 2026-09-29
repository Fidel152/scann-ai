import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

dotenv.config();

const DERIV_SYSTEM_INSTRUCTION = `Tu es "Deriv Synthetic AI", un expert senior en trading d'indices synthétiques sur la plateforme Deriv (anciennement Binary.com) et un analyste spécialisé en Price Action, Smart Money Concepts (SMC) et ICT.

Ton rôle est de servir d'assistant interactif de trading et d'analyseur de graphiques via la vision par ordinateur (analyse d'images).

1. CONNAISSANCES TECHNIQUES DU MARCHÉ DERIV
Tu maîtrises parfaitement les spécificités des indices synthétiques :
- Volatility Indices (V10, V25, V50, V75, V100, V150 1s, V250 1s, V10 1s, V75 1s, V100 1s, etc.)
- Boom & Crash (Boom 300/500/1000, Crash 300/500/1000)
- Step Index (Step 100, Multi-Step), Jump Indices (Jump 10, 25, 50, 75, 100), Range Break Indices (Range Break 100, 200)

Règles de gestion du risque et tailles de lots minimums :
- Volatility 75 (V75) : Lot min = 0.0001 (ou 0.001 selon type de compte)
- Volatility 50 (V50) : Lot min = 0.001 / 0.01
- Volatility 100 (V100) : Lot min = 0.20 / 0.50
- Boom / Crash 1000 : Lot min = 0.20
- Boom / Crash 500 : Lot min = 0.20
- Boom / Crash 300 : Lot min = 0.10 (Crash 300: 0.05)
- Step Index : Lot min = 0.10
- Jump Indices : Lot min = 0.01

2. INSTRUCTIONS D'ANALYSE D'IMAGE (VISION AI)
Quand l'utilisateur te fournit une capture d'écran d'un graphique TradingView ou MetaTrader (MT5) :
- Identification de l'actif et de l'unité de temps : Détecte l'indice (ex: Volatility 50, V75, Boom 1000) et la période (M1, M5, M15, 30m, H1, H4).
- Analyse technique structurée :
  - Tendance principale et structure de marché (BOS - Break of Structure, CHoCH - Change of Character).
  - Zones clés : Supports, Résistances, Blocs d'Ordres (Order Blocks - OB), FVG (Fair Value Gaps) et Liquidité (Liquidity Sweeps / BSL / SSL).
  - Indicateurs présents sur l'image : Croisement de Moyennes Mobiles (EMA/SMA), RSI, MACD, Bollinger, etc.
- Élaboration du Plan de Trading (Setup) :
  - Direction claire : BUY (Achat) ou SELL (Vente).
  - Point d'Entrée (ENTRY) : Prix exact ou zone de prix lisible sur l'échelle de droite du graphique.
  - Stop Loss (SL) : Niveau de prix invalidant le setup (placé derrière un sommet/creux ou Order Block).
  - Take Profit 1 (TP1) : Premier objectif logique (support/résistance intermédiaire ou FVG).
  - Take Profit 2 (TP2) : Objectif étendu (liquidité majeure / swing high ou low).
  - Ratio Risque/Rendement (R:R) : Calculé à partir des points/pips du SL et du TP.
- Recommandation de Money Management :
  - Indique la taille de lot minimale recommandée adaptée à l'actif détecté.
  - Conseil de sécurisation : Déplacer au Break-Even (BE) dès l'atteinte du TP1.

3. FORMAT DE RÉPONSE EXIGÉ
Pour chaque analyse de graphique, réponds de façon structurée selon ce modèle exact :

📊 ANALYSE DU GRAPHIQUE : [Nom de l'actif] ([Unité de temps])

Structure du marché : [Détails]

Zones clés identifiées : [Résistance / Support / Order Block]

Confirmation technique : [Prix sous la moyenne mobile / Rejet / Bougie de retournement]

🎯 PLAN DE TRADING RECOMMANDE :

Action : [BUY / SELL]

Entrée (ENTRY) : [Valeur exacte]

Stop Loss (SL) : [Valeur exacte] (Rouge)

Take Profit 1 (TP1) : [Valeur exacte] (Vert)

Take Profit 2 (TP2) : [Valeur exacte] (Vert)

Ratio Risque/Rendement : [ex: 1:2.5]

⚠️ GESTION DU RISQUE & CONSEILS :

Lot recommandé : [Taille de lot adaptée]

Consigne : [ex: Passer à BE au TP1]

Sois direct, précis, concis et ultra-professionnel dans tes réponses.`;

const FALLBACK_MODELS = [
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
];

function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function generateWithFallback(
  ai: GoogleGenAI,
  params: { contents: any; config: any }
): Promise<GenerateContentResponse> {
  let lastError: any = null;

  for (const modelName of FALLBACK_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code || "";
        const msg = String(err?.message || "");
        const isTransient =
          status === 503 ||
          status === 429 ||
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("high demand") ||
          msg.includes("overloaded") ||
          msg.includes("429");

        console.warn(
          `[Deriv Synthetic AI] Model ${modelName} attempt ${attempt + 1} failed:`,
          msg
        );

        if (!isTransient) {
          break; // Try next model immediately
        }
        // Short backoff before retry
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Service Vision AI temporairement saturé.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // Endpoint 1: Vision AI Chart Analysis
  app.post("/api/analyze-chart", async (req, res) => {
    try {
      const {
        imageBase64,
        mimeType = "image/png",
        assetHint,
        timeframeHint,
        accountBalance,
        riskPercent,
        userNotes,
      } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          error: "Veuillez fournir une capture d'écran du graphique (TradingView ou MT5).",
        });
      }

      const ai = getGenAIClient();
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");

      const contextLines: string[] = [
        "Analyse cette capture d'écran de graphique de trading (MT5 / TradingView) avec une précision chirurgicale selon notre stratégie SMC / ICT / Price Action + Moyenne Mobile (EMA).",
        "RÈGLES CRITIQUES OBLIGATOIRES :",
        "1. LECTURE EXACTE DE L'AXE DES PRIX À DROITE : Lis attentivement tous les nombres sur l'échelle verticale de droite ainsi que le prix actuel (en haut à gauche dans les boutons SELL/BUY et dans l'étiquette colorée sur l'axe de droite). N'invente JAMAIS des prix d'un autre indice ! Tous tes niveaux (ENTRY, SL, TP1, TP2, Order Block, FVG) doivent correspondre exactement à l'échelle de prix visible sur cette capture.",
        "2. RESPECT STRICT DE LA STRATÉGIE (TENDANCE + EMA + SMC) :",
        "   - Regarde où se trouve le prix par rapport à la Moyenne Mobile visible (ex: ligne orange EMA) et observe la succession des sommets et creux.",
        "   - Si le prix est SOUS la moyenne mobile avec une structure baissière (Lower Highs / Lower Lows, cassures de supports / BOS baissiers), tu DOIS donner un plan SELL (Vente) : Entrée sur retracement vers le Bearish Order Block / FVG / EMA (ou sous le support), Stop Loss (SL) AU-DESSUS du dernier sommet/Order Block (donc prix SL > prix ENTRY), et TP1 / TP2 PLUS BAS que l'entrée (donc prix TP2 < prix TP1 < prix ENTRY).",
        "   - Si le prix est AU-DESSUS de la moyenne mobile avec une structure haussière (Higher Highs / Higher Lows, BOS haussiers), tu DOIS donner un plan BUY (Achat) : Entrée sur retracement vers le Bullish Order Block / FVG / EMA, Stop Loss (SL) EN DESSOUS du dernier creux/Order Block (donc prix SL < prix ENTRY), et TP1 / TP2 PLUS HAUTS que l'entrée (donc prix TP2 > prix TP1 > prix ENTRY).",
        "3. CALIBRAGE VISUEL EXACT SUR L'IMAGE :",
        "   - Indique `axisTopPrice` (le prix correspondant au haut de la zone graphique sur l'axe de droite) et `axisBottomPrice` (le prix correspondant au bas de la zone graphique sur l'axe de droite).",
        "   - Indique la position X et Y exacte (en % de 0 à 100) de la dernière bougie (prix actuel), de l'Order Block réel sur les bougies, du FVG réel et de la ligne BOS/CHoCH.",
      ];

      if (assetHint && assetHint !== "AUTO") {
        contextLines.push(`Indice indiqué par le trader : ${assetHint}`);
      }
      if (timeframeHint && timeframeHint !== "AUTO") {
        contextLines.push(`Unité de temps indiquée par le trader : ${timeframeHint}`);
      }
      if (accountBalance) {
        contextLines.push(`Capital du compte : ${accountBalance} USD (Risque visé : ${riskPercent || 1}%)`);
      }
      if (userNotes) {
        contextLines.push(`Note ou question spécifique du trader : ${userNotes}`);
      }

      const response: GenerateContentResponse = await generateWithFallback(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: contextLines.join("\n"),
            },
          ],
        },
        config: {
          systemInstruction: DERIV_SYSTEM_INSTRUCTION,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              asset: {
                type: Type.STRING,
                description: "Nom de l'actif détecté (ex: Volatility 75 Index, Boom 1000 Index, Volatility 50 Index)",
              },
              timeframe: {
                type: Type.STRING,
                description: "Unité de temps détectée (ex: M15, M5, H1, H4)",
              },
              marketStructure: {
                type: Type.STRING,
                description: "Analyse précise de la tendance principale et structure du marché (BOS, CHoCH, HH/HL ou LH/LL)",
              },
              keyZones: {
                type: Type.STRING,
                description: "Zones clés identifiées avec niveaux de prix : Order Blocks (OB), Fair Value Gaps (FVG), Supports/Résistances, Liquidity Sweeps",
              },
              technicalConfirmation: {
                type: Type.STRING,
                description: "Confirmation technique (rejet, bougie d'englobante, croisement EMA, RSI, déplacement impulsif)",
              },
              action: {
                type: Type.STRING,
                description: "BUY ou SELL uniquement",
              },
              entryPrice: {
                type: Type.STRING,
                description: "Valeur exacte ou zone serrée du point d'entrée (ex: 425120.50)",
              },
              stopLoss: {
                type: Type.STRING,
                description: "Valeur exacte du Stop Loss (ex: 421800.00)",
              },
              takeProfit1: {
                type: Type.STRING,
                description: "Valeur exacte du Take Profit 1 (ex: 430500.00)",
              },
              takeProfit2: {
                type: Type.STRING,
                description: "Valeur exacte du Take Profit 2 (ex: 436900.00)",
              },
              riskRewardRatio: {
                type: Type.STRING,
                description: "Ratio Risque/Rendement calculé (ex: 1:2.8)",
              },
              recommendedLot: {
                type: Type.STRING,
                description: "Taille de lot minimale/adaptée selon les règles Deriv (ex: 0.001 sur V75, 0.20 sur Boom 1000)",
              },
              managementAdvice: {
                type: Type.STRING,
                description: "Consigne de gestion du trade (ex: Sécuriser 50% et passer le Stop Loss à Break-Even (BE) dès l'atteinte du TP1)",
              },
              smcConceptsDetected: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste courte des concepts SMC/ICT détectés (ex: ['CHoCH Haussier', 'Order Block M15', 'FVG Non Comblé', 'Liquidity Sweep SSL'])",
              },
              confidenceNote: {
                type: Type.STRING,
                description: "Synthèse de confluence technique en 1 phrase (ex: Forte confluence entre le balayage de liquidité SSL et l'Order Block M15)",
              },
              chartAnnotations: {
                type: Type.OBJECT,
                description: "Coordonnées visuelles en pourcentage (0 à 100) et bornes de l'axe des prix sur l'image pour tracer le setup aux bons niveaux.",
                properties: {
                  axisTopPrice: {
                    type: Type.NUMBER,
                    description: "Prix numérique lu tout en haut de l'échelle de prix à droite de l'image",
                  },
                  axisBottomPrice: {
                    type: Type.NUMBER,
                    description: "Prix numérique lu tout en bas de l'échelle de prix à droite de l'image",
                  },
                  entryY: {
                    type: Type.NUMBER,
                    description: "Position verticale Y (en % de 8 à 92, 0=haut de l'image, 100=bas) correspondant exactement au prix ENTRY sur l'axe de droite",
                  },
                  stopLossY: {
                    type: Type.NUMBER,
                    description: "Position verticale Y (en % de 8 à 92) correspondant exactement au prix Stop Loss (SL). Pour SELL: stopLossY < entryY (plus haut). Pour BUY: stopLossY > entryY (plus bas).",
                  },
                  tp1Y: {
                    type: Type.NUMBER,
                    description: "Position verticale Y (en % de 8 à 92) correspondant au prix TP1. Pour SELL: tp1Y > entryY (plus bas). Pour BUY: tp1Y < entryY (plus haut).",
                  },
                  tp2Y: {
                    type: Type.NUMBER,
                    description: "Position verticale Y (en % de 6 à 94) correspondant au prix TP2. Pour SELL: tp2Y > tp1Y (plus bas). Pour BUY: tp2Y < tp1Y (plus haut).",
                  },
                  currentPriceX: {
                    type: Type.NUMBER,
                    description: "Position horizontale X (en % de 50 à 90) où se trouve la toute dernière bougie (prix actuel) sur l'image",
                  },
                  currentPriceY: {
                    type: Type.NUMBER,
                    description: "Position verticale Y (en % de 8 à 92) où se trouve la toute dernière bougie (prix actuel) sur l'image",
                  },
                  orderBlock: {
                    type: Type.OBJECT,
                    properties: {
                      xStart: { type: Type.NUMBER, description: "X début en % de la bougie de l'Order Block" },
                      xEnd: { type: Type.NUMBER, description: "X fin en % (jusqu'à la droite du graphique, ex: 90)" },
                      yTop: { type: Type.NUMBER, description: "Y haut du rectangle Order Block en % (autour de entryY)" },
                      yBottom: { type: Type.NUMBER, description: "Y bas du rectangle Order Block en % (autour de entryY)" },
                      label: { type: Type.STRING, description: "Ex: BEARISH ORDER BLOCK (OB) ou BULLISH ORDER BLOCK (OB)" },
                    },
                    required: ["xStart", "xEnd", "yTop", "yBottom", "label"],
                  },
                  fvgZone: {
                    type: Type.OBJECT,
                    properties: {
                      xStart: { type: Type.NUMBER, description: "X début en % de la zone FVG" },
                      xEnd: { type: Type.NUMBER, description: "X fin en % (ex: 88)" },
                      yTop: { type: Type.NUMBER, description: "Y haut du FVG en %" },
                      yBottom: { type: Type.NUMBER, description: "Y bas du FVG en %" },
                      label: { type: Type.STRING, description: "Ex: FVG (Imbalance)" },
                    },
                    required: ["xStart", "xEnd", "yTop", "yBottom", "label"],
                  },
                  structureMarkers: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        xStart: { type: Type.NUMBER },
                        xEnd: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                        label: { type: Type.STRING, description: "Ex: BOS BAISSIER, CHoCH, LIQUIDITY SWEEP" },
                      },
                      required: ["xStart", "xEnd", "y", "label"],
                    },
                  },
                },
                required: [
                  "axisTopPrice",
                  "axisBottomPrice",
                  "entryY",
                  "stopLossY",
                  "tp1Y",
                  "tp2Y",
                  "currentPriceX",
                  "currentPriceY",
                  "orderBlock",
                  "fvgZone",
                  "structureMarkers",
                ],
              },
            },
            required: [
              "asset",
              "timeframe",
              "marketStructure",
              "keyZones",
              "technicalConfirmation",
              "action",
              "entryPrice",
              "stopLoss",
              "takeProfit1",
              "takeProfit2",
              "riskRewardRatio",
              "recommendedLot",
              "managementAdvice",
              "smcConceptsDetected",
              "confidenceNote",
              "chartAnnotations",
            ],
          },
        },
      });

      const rawText = (response.text || "{}")
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      const parsed = JSON.parse(rawText);

      // Normalize action to BUY or SELL
      const normalizedAction =
        String(parsed.action || "BUY").toUpperCase().includes("SELL") ? "SELL" : "BUY";

      // Calibrate chartAnnotations Y coordinates mathematically from the price scale if valid numbers exist
      const parseNum = (v: any) => {
        if (typeof v === "number") return v;
        const cleaned = String(v || "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
        return cleaned ? parseFloat(cleaned[0]) : NaN;
      };

      const pEntry = parseNum(parsed.entryPrice);
      const pSL = parseNum(parsed.stopLoss);
      const pTP1 = parseNum(parsed.takeProfit1);
      const pTP2 = parseNum(parsed.takeProfit2);

      if (!isNaN(pEntry) && !isNaN(pSL) && !isNaN(pTP1) && !isNaN(pTP2)) {
        const ca = parsed.chartAnnotations || {};
        const allSetupPrices = [pEntry, pSL, pTP1, pTP2];
        const minSetup = Math.min(...allSetupPrices);
        const maxSetup = Math.max(...allSetupPrices);
        const span = Math.max(maxSetup - minSetup, 0.0001);

        let topP = parseNum(ca.axisTopPrice);
        let botP = parseNum(ca.axisBottomPrice);

        if (isNaN(topP) || isNaN(botP) || topP <= botP) {
          topP = maxSetup + span * 0.15;
          botP = minSetup - span * 0.15;
        } else {
          // Ensure the scale encompasses the setup levels with margin
          topP = Math.max(topP, maxSetup + span * 0.08);
          botP = Math.min(botP, minSetup - span * 0.08);
        }

        const priceToY = (p: number) => {
          const ratio = (topP - p) / Math.max(topP - botP, 0.0001);
          return Math.max(8, Math.min(92, Number((10 + ratio * 78).toFixed(1))));
        };

        const computedEntryY = priceToY(pEntry);
        const computedSLY = priceToY(pSL);
        const computedTP1Y = priceToY(pTP1);
        const computedTP2Y = priceToY(pTP2);

        const obHalfHeight = Math.max(Math.abs(computedSLY - computedEntryY) * 0.35, 3.5);
        const obTop =
          normalizedAction === "SELL"
            ? Math.max(6, computedEntryY - obHalfHeight)
            : computedEntryY - 1.5;
        const obBottom =
          normalizedAction === "SELL"
            ? computedEntryY + 1.5
            : Math.min(94, computedEntryY + obHalfHeight);

        const fvgTop =
          normalizedAction === "SELL"
            ? computedEntryY + 1.5
            : Math.max(6, computedEntryY - obHalfHeight - 5);
        const fvgBottom = fvgTop + 5.5;

        parsed.chartAnnotations = {
          ...ca,
          axisTopPrice: topP,
          axisBottomPrice: botP,
          entryY: computedEntryY,
          stopLossY: computedSLY,
          tp1Y: computedTP1Y,
          tp2Y: computedTP2Y,
          currentPriceX: ca.currentPriceX || 76,
          currentPriceY: ca.currentPriceY || computedEntryY,
          orderBlock: {
            xStart: ca.orderBlock?.xStart || 38,
            xEnd: ca.orderBlock?.xEnd || 89,
            yTop: Number(obTop.toFixed(1)),
            yBottom: Number(obBottom.toFixed(1)),
            label:
              ca.orderBlock?.label ||
              (normalizedAction === "SELL"
                ? "BEARISH ORDER BLOCK (OB) + SUPPLY"
                : "BULLISH ORDER BLOCK (OB) + DEMAND"),
          },
          fvgZone: {
            xStart: ca.fvgZone?.xStart || 50,
            xEnd: ca.fvgZone?.xEnd || 88,
            yTop: Number(fvgTop.toFixed(1)),
            yBottom: Number(fvgBottom.toFixed(1)),
            label: ca.fvgZone?.label || "FVG (Fair Value Gap)",
          },
          structureMarkers: Array.isArray(ca.structureMarkers)
            ? ca.structureMarkers
            : [],
        };
      }

      // Construct the exact required formatted response block
      const formattedReport = `📊 ANALYSE DU GRAPHIQUE : ${parsed.asset} (${parsed.timeframe})

Structure du marché : ${parsed.marketStructure}

Zones clés identifiées : ${parsed.keyZones}

Confirmation technique : ${parsed.technicalConfirmation}

🎯 PLAN DE TRADING RECOMMANDE :

Action : ${normalizedAction}

Entrée (ENTRY) : ${parsed.entryPrice}

Stop Loss (SL) : ${parsed.stopLoss} (Rouge)

Take Profit 1 (TP1) : ${parsed.takeProfit1} (Vert)

Take Profit 2 (TP2) : ${parsed.takeProfit2} (Vert)

Ratio Risque/Rendement : ${parsed.riskRewardRatio}

⚠️ GESTION DU RISQUE & CONSEILS :

Lot recommandé : ${parsed.recommendedLot}

Consigne : ${parsed.managementAdvice}`;

      return res.json({
        ...parsed,
        action: normalizedAction,
        formattedReport,
      });
    } catch (error: any) {
      console.error("Error in /api/analyze-chart:", error);
      return res.status(500).json({
        error:
          error?.message ||
          "Erreur lors de l'analyse Vision AI du graphique. Veuillez réessayer.",
      });
    }
  });

  // Endpoint 2: Interactive Deriv Synthetic AI Assistant Chat
  app.post("/api/assistant-chat", async (req, res) => {
    try {
      const { messages, activeAnalysis, imageBase64, mimeType = "image/png" } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages manquants." });
      }

      const ai = getGenAIClient();

      const conversationHistory = messages
        .map((m: { role: string; content: string }) =>
          `${m.role === "user" ? "TRADER" : "DERIV SYNTHETIC AI"}: ${m.content}`
        )
        .join("\n\n");

      const parts: any[] = [];

      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(
          /^data:image\/[a-zA-Z0-9+.-]+;base64,/,
          ""
        );
        parts.push({
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        });
      }

      let contextPrompt = "";
      if (activeAnalysis) {
        contextPrompt += `CONTEXTE DU GRAPHIQUE ACTUELLEMENT ANALYSÉ :\n${activeAnalysis.formattedReport}\n\n`;
      }

      contextPrompt += `HISTORIQUE DE CONVERSATION :\n${conversationHistory}\n\nRéponds à la dernière intervention du TRADER en tant que Deriv Synthetic AI (expert senior Price Action, SMC, ICT & indices synthétiques Deriv). Si le trader demande une analyse complète d'un graphique fourni, utilise impérativement le format structuré officiel (📊 ANALYSE DU GRAPHIQUE / 🎯 PLAN DE TRADING RECOMMANDE / ⚠️ GESTION DU RISQUE & CONSEILS). Sois direct, précis, concis et ultra-professionnel.`;

      parts.push({ text: contextPrompt });

      const response: GenerateContentResponse = await generateWithFallback(ai, {
        contents: { parts },
        config: {
          systemInstruction: DERIV_SYSTEM_INSTRUCTION,
          temperature: 0.3,
        },
      });

      return res.json({
        reply: response.text || "Aucune réponse générée.",
      });
    } catch (error: any) {
      console.error("Error in /api/assistant-chat:", error);
      return res.status(500).json({
        error:
          error?.message ||
          "Erreur lors de la communication avec Deriv Synthetic AI.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Deriv Synthetic AI server running on http://localhost:${PORT}`);
  });
}

startServer();
