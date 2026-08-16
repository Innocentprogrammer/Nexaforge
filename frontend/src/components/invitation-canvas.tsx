import type { TemplateJson } from "@/lib/types";

/** Curated heading fonts for invitation *content* (not NexaForge's own UI chrome —
 * see the note in app/layout.tsx). Keys are stored in template_json.heading_font. */
export const FONT_OPTIONS: { key: string; label: string; family: string }[] = [
  { key: "playfair", label: "Elegant Serif", family: "var(--font-playfair), Georgia, serif" },
  { key: "dancing", label: "Romantic Script", family: "var(--font-dancing), cursive" },
  { key: "poppins", label: "Modern", family: "var(--font-poppins), sans-serif" },
  { key: "inter", label: "Clean", family: "var(--font-inter), sans-serif" },
];

export function headingFontFamily(key: string | undefined): string {
  return FONT_OPTIONS.find((f) => f.key === key)?.family ?? FONT_OPTIONS[0].family;
}

export const PATTERN_OPTIONS: { key: string; label: string }[] = [
  { key: "none", label: "None" },
  { key: "frame", label: "Ornate Frame" },
  { key: "dots", label: "Dot Grid" },
  { key: "sparkle", label: "Sparkle" },
  { key: "confetti", label: "Confetti" },
  { key: "florals", label: "Florals" },
];

function withAlpha(hex: string, alpha: string) {
  // hex like #2563eb -> #2563ebNN ; falls back gracefully if already has alpha or is invalid.
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  return `${hex}${alpha}`;
}

function PatternOverlay({ pattern, accent }: { pattern: string; accent: string }) {
  if (pattern === "dots") {
    return (
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${withAlpha(accent, "55")} 1.5px, transparent 1.5px)`,
          backgroundSize: "20px 20px",
        }}
      />
    );
  }
  if (pattern === "confetti") {
    return (
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            `radial-gradient(circle at 12% 20%, ${withAlpha(accent, "77")} 3px, transparent 3px)`,
            `radial-gradient(circle at 85% 15%, ${withAlpha(accent, "55")} 4px, transparent 4px)`,
            `radial-gradient(circle at 25% 88%, ${withAlpha(accent, "66")} 3px, transparent 3px)`,
            `radial-gradient(circle at 75% 80%, ${withAlpha(accent, "44")} 5px, transparent 5px)`,
            `radial-gradient(circle at 50% 45%, ${withAlpha(accent, "33")} 2px, transparent 2px)`,
            `radial-gradient(circle at 90% 55%, ${withAlpha(accent, "55")} 3px, transparent 3px)`,
            `radial-gradient(circle at 8% 60%, ${withAlpha(accent, "44")} 4px, transparent 4px)`,
          ].join(", "),
        }}
      />
    );
  }
  if (pattern === "sparkle") {
    const positions = [
      { top: "10%", left: "8%", size: "1rem" },
      { top: "18%", left: "88%", size: "0.75rem" },
      { top: "82%", left: "12%", size: "0.85rem" },
      { top: "88%", left: "85%", size: "1.1rem" },
      { top: "50%", left: "5%", size: "0.7rem" },
      { top: "45%", left: "93%", size: "0.9rem" },
    ];
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {positions.map((p, i) => (
          <span
            key={i}
            className="absolute"
            style={{ top: p.top, left: p.left, fontSize: p.size, color: accent, opacity: 0.7 }}
          >
            ✦
          </span>
        ))}
      </div>
    );
  }
  if (pattern === "florals") {
    const corners = [
      { top: "6%", left: "6%" },
      { top: "6%", right: "6%" },
      { bottom: "6%", left: "6%" },
      { bottom: "6%", right: "6%" },
    ];
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {corners.map((pos, i) => (
          <span
            key={i}
            className="absolute text-xl"
            style={{ ...pos, color: accent, opacity: 0.55 }}
          >
            ❁
          </span>
        ))}
      </div>
    );
  }
  return null;
}

export interface InvitationCanvasData extends Pick<
  TemplateJson,
  | "background_color"
  | "background_color_2"
  | "font_color"
  | "accent_color"
  | "heading_font"
  | "pattern"
  | "heading"
  | "subheading"
  | "message"
> {
  title?: string;
  venue?: string;
  eventDate?: string | null;
}

export function InvitationCanvas({
  data,
  size = "full",
}: {
  data: InvitationCanvasData;
  size?: "card" | "full";
}) {
  const background = data.background_color || "#ffffff";
  const background2 = data.background_color_2;
  const fontColor = data.font_color || data.accent_color || "#1a1a2e";
  const accent = data.accent_color || "#2563eb";
  const pattern = data.pattern || "none";
  const isCard = size === "card";

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-xl border text-center ${
        isCard ? "h-48 px-5 py-6" : "min-h-[420px] px-10 py-14"
      }`}
      style={{
        background: background2
          ? `linear-gradient(135deg, ${background} 0%, ${background2} 100%)`
          : background,
        borderColor: withAlpha(accent, "40"),
      }}
    >
      <PatternOverlay pattern={pattern} accent={accent} />

      {pattern === "frame" && (
        <div
          className="pointer-events-none absolute rounded-lg"
          style={{
            inset: isCard ? "8px" : "16px",
            border: `1px solid ${withAlpha(accent, "70")}`,
          }}
        />
      )}

      <div className="relative">
        <p
          className={`font-semibold leading-tight ${isCard ? "text-lg" : "text-3xl sm:text-4xl"}`}
          style={{ color: fontColor, fontFamily: headingFontFamily(data.heading_font) }}
        >
          {data.heading || data.title || "Your Event"}
        </p>

        {!isCard && (
          <div
            className="mx-auto mt-4 h-px w-16"
            style={{ backgroundColor: withAlpha(accent, "aa") }}
          />
        )}

        {data.subheading && (
          <p
            className={`${isCard ? "mt-1 text-xs" : "mt-4 text-base"}`}
            style={{ color: fontColor, opacity: 0.8 }}
          >
            {data.subheading}
          </p>
        )}

        {!isCard && data.venue && (
          <p className="mt-6 text-sm" style={{ color: fontColor, opacity: 0.65 }}>
            {data.venue}
          </p>
        )}
        {!isCard && data.eventDate && (
          <p className="mt-1 text-sm" style={{ color: fontColor, opacity: 0.65 }}>
            {new Date(data.eventDate).toLocaleString()}
          </p>
        )}
        {!isCard && data.message && (
          <p
            className="mx-auto mt-6 max-w-sm text-sm italic"
            style={{ color: fontColor, opacity: 0.65 }}
          >
            {data.message}
          </p>
        )}
      </div>
    </div>
  );
}
