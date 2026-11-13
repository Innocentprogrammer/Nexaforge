import Image from "next/image";

/**
 * NexaForge brand lockup: the "N" mark image plus a live-text wordmark.
 * The wordmark is HTML (not baked into the image) so it stays crisp at any
 * size and "Nexa" can follow the theme's heading colour in dark mode.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/nexaforge-mark.png"
      alt=""
      width={size}
      height={size}
      loading="eager"
      unoptimized
      className={`shrink-0 select-none ${className}`}
    />
  );
}

export function Logo({
  size = 32,
  className = "",
  textClassName = "text-xl",
}: {
  size?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className={`font-heading font-bold tracking-tight ${textClassName}`}>
        <span className="text-heading">Nexa</span>
        <span className="text-[#5b21d9] dark:text-[#a78bfa]">Forge</span>
      </span>
    </span>
  );
}
