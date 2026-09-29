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
        "Analyse cette capture d'écran de graphique de trading (MT5 / TradingView) avec une précision institutionnelle SMC / ICT / Price Action.",
        "Lis attentivement le nom de l'indice en haut à gauche (ou en filigrane) ainsi que l'échelle de prix à droite pour extraire des niveaux d'Entrée (ENTRY), Stop Loss (SL), Take Profit 1 (TP1) et Take Profit 2 (TP2) cohérents et exacts.",
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

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
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
            ],
          },
        },
      });

      const rawText = response.text || "{}";
      const parsed = JSON.parse(rawText);

      // Normalize action to BUY or SELL
      const normalizedAction =
        String(parsed.action || "BUY").toUpperCase().includes("SELL") ? "SELL" : "BUY";

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

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
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
