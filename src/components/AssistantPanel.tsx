import React, { useState, useRef } from "react";
import { Send, Upload, X, Loader2, Copy, Check } from "lucide-react";
import { ChartAnalysisResult } from "../data/derivIndices";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  hasImage?: boolean;
}

interface AssistantPanelProps {
  activeAnalysis: ChartAnalysisResult | null;
}

const QUICK_PROMPTS = [
  "Détaille la confluence SMC (Order Block + FVG + BOS) du graphique actif",
  "Quel plan de sécurisation Break-Even (BE) appliquer au TP1 sur Volatility 75 ?",
  "Comment filtrer les faux spikes sur Boom 1000 et Crash 1000 en M15/M5 ?",
  "Rappelle les tailles de lots minimums sur V75, V50, V100 et Boom/Crash 1000",
];

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  activeAnalysis,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: `Bonjour. Je suis **Deriv Synthetic AI**, votre analyste senior spécialisé en Price Action, Smart Money Concepts (SMC) et ICT sur les indices synthétiques Deriv (Volatility V10–V250, Boom & Crash, Step Index, Jump Indices).

Vous pouvez m'interroger sur le graphique actuellement chargé dans l'analyseur Vision, joindre une nouvelle capture MT5/TradingView, ou me demander un calibrage précis de votre plan de trading (Entrée, SL, TP1, TP2, Ratio R:R et Money Management).`,
      timestamp: "Session active",
    },
  ]);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAttachedImage({
          base64: reader.result,
          mimeType: file.type || "image/png",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (textToSend?: string) => {
    const trimmed = (textToSend ?? input).trim();
    if ((!trimmed && !attachedImage) || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content:
        trimmed ||
        "Analyse ce graphique MT5/TradingView selon le protocole officiel Deriv Synthetic AI.",
      timestamp: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      hasImage: Boolean(attachedImage),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    const currentAttachment = attachedImage;
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          activeAnalysis,
          imageBase64: currentAttachment?.base64 || activeAnalysis?.imageUrl,
          mimeType: currentAttachment?.mimeType || "image/png",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur serveur");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ Erreur d'analyse : ${
            err?.message || "Impossible de joindre le moteur Deriv Synthetic AI."
          }`,
          timestamp: new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
            Consultant Interactif SMC, ICT & Price Action
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Dialoguez en direct avec Deriv Synthetic AI sur votre setup actif ou soumettez vos questions techniques.
          </p>
        </div>
        {activeAnalysis && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Contexte synchronisé : {activeAnalysis.asset}</span>
            <span aria-hidden="true">·</span>
            <span>{activeAnalysis.timeframe}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                activeAnalysis.action === "BUY"
                  ? "text-emerald-400 font-semibold"
                  : "text-red-400 font-semibold"
              }
            >
              {activeAnalysis.action} @ {activeAnalysis.entryPrice}
            </span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => sendMessage(prompt)}
            disabled={isLoading}
            className="text-left px-3.5 py-2 text-xs font-medium bg-[#1E293B] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Conversation Container */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl flex flex-col h-[540px]">
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                <span className="font-medium text-slate-300">
                  {msg.role === "user" ? "Trader" : "Deriv Synthetic AI"}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{msg.timestamp}</span>
                {msg.hasImage && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400">Graphique joint</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-3xl rounded-xl px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-emerald-600/20 border border-emerald-500/30 text-slate-100"
                    : "bg-[#0F172A] border border-slate-800 text-slate-200 font-sans"
                }`}
              >
                {msg.content}
                {msg.role === "assistant" && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier la réponse</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2.5 text-xs text-slate-400 bg-[#0F172A] border border-slate-800 rounded-xl px-4 py-3 w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Analyse institutionnelle SMC / ICT en cours...</span>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="p-4 border-t border-slate-800 bg-[#0F172A]/60 rounded-b-xl">
          {attachedImage && (
            <div className="flex items-center justify-between bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2 mb-3 text-xs text-slate-300">
              <span>Capture de graphique prête pour l'analyse Vision AI</span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="text-slate-400 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2.5 bg-[#1E293B] hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>Joindre Graphique</span>
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez une question sur V75, Boom 1000, Order Blocks, FVG ou le setup actif..."
              className="flex-1 bg-[#1E293B] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />

            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachedImage)}
              className="px-4 py-2.5 bg-[#16A34A] hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Envoyer</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
