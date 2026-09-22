"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Palette, Quote, Sparkles, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface QuoteCardDialogProps {
  open: boolean;
  onClose: () => void;
  storyTitle: string;
  defaultQuote: string;
  authorName?: string;
}

type CardTheme = "obsidian" | "emerald" | "crimson" | "sapphire";

const THEMES: Record<
  CardTheme,
  {
    name: string;
    bgGradient: [string, string, string];
    accentColor: string;
    textColor: string;
    quoteColor: string;
    borderGlow: string;
  }
> = {
  obsidian: {
    name: "Obsidian Night",
    bgGradient: ["#0f172a", "#1e1b4b", "#090d16"],
    accentColor: "#818cf8",
    textColor: "#f8fafc",
    quoteColor: "rgba(129, 140, 248, 0.35)",
    borderGlow: "rgba(99, 102, 241, 0.4)",
  },
  emerald: {
    name: "Mystic Forest",
    bgGradient: ["#022c22", "#064e3b", "#021c16"],
    accentColor: "#34d399",
    textColor: "#f0fdf4",
    quoteColor: "rgba(52, 211, 153, 0.35)",
    borderGlow: "rgba(16, 185, 129, 0.4)",
  },
  crimson: {
    name: "Twilight Rose",
    bgGradient: ["#450a0a", "#701a23", "#1c0406"],
    accentColor: "#fb7185",
    textColor: "#fff1f2",
    quoteColor: "rgba(251, 113, 133, 0.35)",
    borderGlow: "rgba(244, 63, 94, 0.4)",
  },
  sapphire: {
    name: "Midnight Ocean",
    bgGradient: ["#082f49", "#0c4a6e", "#031c2c"],
    accentColor: "#38bdf8",
    textColor: "#f0f9ff",
    quoteColor: "rgba(56, 189, 248, 0.35)",
    borderGlow: "rgba(14, 165, 233, 0.4)",
  },
};

export function QuoteCardDialog({
  open,
  onClose,
  storyTitle,
  defaultQuote,
  authorName = "TaleForge Author",
}: QuoteCardDialogProps) {
  const { language } = useLanguage();
  const [quoteText, setQuoteText] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>("obsidian");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (defaultQuote) {
      // Pick first 2-3 sentences or clean excerpt
      const clean = defaultQuote
        .replace(/^#\s+[^\n]+\n+/, "")
        .replace(/[#*`_]/g, "")
        .trim();
      const firstChunk = clean.slice(0, 220).trim();
      setQuoteText(firstChunk);
    }
  }, [defaultQuote]);

  const drawCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    const theme = THEMES[selectedTheme];

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, theme.bgGradient[0]);
    bgGrad.addColorStop(0.5, theme.bgGradient[1]);
    bgGrad.addColorStop(1, theme.bgGradient[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Ambient Decorative Glow Spheres
    const radial = ctx.createRadialGradient(
      width * 0.2,
      height * 0.2,
      50,
      width * 0.2,
      height * 0.2,
      400
    );
    radial.addColorStop(0, theme.quoteColor);
    radial.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // 3. Ornate Double Border
    ctx.strokeStyle = theme.borderGlow;
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, width - 120, height - 120);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(75, 75, width - 150, height - 150);

    // 4. Giant Decorative Quotation Mark
    ctx.font = "bold 200px 'Playfair Display', serif";
    ctx.fillStyle = theme.quoteColor;
    ctx.fillText("“", 120, 260);

    // 5. Quote Text Wrapping
    ctx.fillStyle = theme.textColor;
    ctx.font = "500 42px 'Noto Serif Bengali', 'Playfair Display', serif";
    ctx.textAlign = "left";

    const textToDraw = quoteText || "বৃষ্টির জলের মতোই কিছু অনুভূতি অনন্তকাল বহমান থেকে যায়...";
    const maxWidth = width - 280;
    const lineHeight = 68;
    const words = textToDraw.split(" ");
    let line = "";
    const lines: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(line);
        line = words[i] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    // Center vertical placement
    const totalTextHeight = lines.length * lineHeight;
    const startY = Math.max(340, (height - totalTextHeight) / 2 - 20);

    for (let j = 0; j < Math.min(lines.length, 7); j++) {
      ctx.fillText(lines[j].trim(), 140, startY + j * lineHeight);
    }

    // 6. Dividing Accent Rule
    const ruleY = startY + Math.min(lines.length, 7) * lineHeight + 40;
    const ruleGrad = ctx.createLinearGradient(140, 0, 440, 0);
    ruleGrad.addColorStop(0, theme.accentColor);
    ruleGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = ruleGrad;
    ctx.fillRect(140, ruleY, 300, 3);

    // 7. Story Title & Author Attribution
    ctx.font = "bold 32px 'Noto Serif Bengali', sans-serif";
    ctx.fillStyle = theme.textColor;
    ctx.fillText(`— ${storyTitle.replace(/^#\s*/, "")}`, 140, ruleY + 60);

    ctx.font = "500 24px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText(`${authorName}`, 140, ruleY + 100);

    // 8. TaleForge Brand Stamp in Bottom Right
    ctx.textAlign = "right";
    ctx.font = "bold 26px 'Outfit', sans-serif";
    ctx.fillStyle = theme.accentColor;
    ctx.fillText("✦ TaleForge", width - 140, height - 130);

    ctx.font = "400 18px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fillText("AI Story Crafting & Literary Forge", width - 140, height - 100);
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        drawCard();
      }, 100);
    }
  }, [open, quoteText, selectedTheme]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const cleanTitle =
        storyTitle.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF_-]+/gi, "_") || "quote";
      a.download = `taleforge_quote_${cleanTitle}.png`;
      a.click();
    } catch (err) {
      console.error("Failed to export image:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in-50">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl border border-border bg-surface shadow-2xl p-4 sm:p-6 overflow-hidden max-h-[92dvh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Quote className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground font-display">
                {language === "bn" ? "সোশ্যাল মিডিয়া উদ্ধৃতি কার্ড" : "Social Quote Card Generator"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {language === "bn"
                  ? "গল্পের আকর্ষণীয় পঙক্তিগুলো ছবির মতো তৈরি করে শেয়ার করুন"
                  : "Export captivating literary moments into beautiful social cards"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:bg-surface-hover hover:text-foreground transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-4 pr-1">
          {/* Theme Selector */}
          <div>
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
              <Palette className="h-3.5 w-3.5 text-primary" />
              <span>{language === "bn" ? "রঙিন আবহ থিম নির্বাচন করুন" : "Select Color Theme"}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(THEMES) as CardTheme[]).map((themeKey) => {
                const t = THEMES[themeKey];
                const isSelected = selectedTheme === themeKey;
                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => setSelectedTheme(themeKey)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border/70 hover:bg-surface-hover text-muted-foreground"
                    )}
                  >
                    <span
                      className="h-4 w-4 rounded-full shrink-0 border border-white/20 shadow-xs"
                      style={{ background: t.accentColor }}
                    />
                    <span className="truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quote Text Input */}
          <div>
            <label className="text-xs font-bold text-foreground flex items-center justify-between mb-1.5">
              <span>{language === "bn" ? "কার্ডের উদ্ধৃতি বা সংলাপ" : "Quote Text"}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {quoteText.length}/280
              </span>
            </label>
            <textarea
              rows={3}
              value={quoteText}
              maxLength={280}
              onChange={(e) => setQuoteText(e.target.value)}
              placeholder="গল্পের মূল অনুভূতি বা পছন্দের সংলাপ লিখুন..."
              className="w-full rounded-2xl border border-border bg-surface-hover/60 p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Live Canvas Preview */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-black/40 border border-border/60">
            <p className="text-[11px] font-bold text-muted-foreground mb-2 self-start flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>{language === "bn" ? "লাইভ প্রিভিউ (1080×1080 HD)" : "Live Retina Preview"}</span>
            </p>
            <div className="w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-border/70 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            {language === "bn" ? "বাতিল" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-radiant px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-radiant hover:brightness-110 active:scale-95 transition"
          >
            <Download className="h-4 w-4" />
            <span>
              {downloading
                ? language === "bn"
                  ? "তৈরি হচ্ছে..."
                  : "Exporting..."
                : language === "bn"
                ? "কার্ড ডাউনলোড করুন (PNG)"
                : "Download Card (PNG)"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
