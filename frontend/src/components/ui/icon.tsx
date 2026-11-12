import type { SVGProps } from "react";

/**
 * The project's single icon set — one geometry, one stroke weight, one grid.
 *
 * Everything is drawn on a 24×24 grid with a 1.75 stroke and round joins, so
 * icons stay optically consistent at every size we use them:
 *   13–14px  inline with xs/sm text, table row actions
 *   16px     default for controls (buttons, inputs, badges)
 *   18px     larger buttons, list headings
 *   20px     navigation and feature tiles
 *   24px     empty states and confirmation marks
 *
 * Hand-drawn rather than pulled from a package: the app previously mixed
 * typographic glyphs (⚙ ✦ ☁ ⤳ …) whose weights and baselines never matched,
 * and adding an icon dependency for ~40 glyphs is not worth the bundle.
 */

const P = {
  // Navigation
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  templates: (
    <>
      <rect x="3" y="3" width="18" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-1.5A4.5 4.5 0 0 0 15.5 15h-7A4.5 4.5 0 0 0 4 19.5V21" />
      <circle cx="12" cy="7.5" r="4" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-1.5A4.5 4.5 0 0 0 12.5 15h-6A4.5 4.5 0 0 0 2 19.5V21" />
      <circle cx="9.5" cy="7.5" r="4" />
      <path d="M17 3.7a4 4 0 0 1 0 7.6" />
      <path d="M22 21v-1.5a4.5 4.5 0 0 0-3.5-4.4" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5 12 3.5l9 7V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 9h3a2 2 0 0 1 2 2v10" />
      <path d="M3 21h18M8 7h4M8 11h4M8 15h4" />
    </>
  ),

  // Chevrons & arrows
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  "chevron-up": <path d="m18 14.5-6-6-6 6" />,
  "chevron-right": <path d="m9.5 18 6-6-6-6" />,
  "chevron-left": <path d="m14.5 6-6 6 6 6" />,
  "chevrons-left": <path d="m11 18-6-6 6-6M19 18l-6-6 6-6" />,
  "chevrons-right": <path d="m13 6 6 6-6 6M5 6l6 6-6 6" />,
  "arrow-left": <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  "arrow-right": <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
  "arrow-up-right": <path d="M7 17 17 7m0 0H8.5M17 7v8.5" />,

  // Actions
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m20 6.5-11 11-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4.4-4.4" />
    </>
  ),
  filter: <path d="M21.5 4H2.5l7.6 9v6.2l3.8 1.8V13z" />,
  download: (
    <>
      <path d="M21 15.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.5" />
      <path d="M7.5 10.5 12 15l4.5-4.5M12 15V3" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.5" />
      <path d="M7.5 7.5 12 3l4.5 4.5M12 3v12" />
    </>
  ),
  send: <path d="M21.5 2.5 2.5 9.8l7.4 2.3 2.3 7.4z M21.5 2.5 9.9 12.1" />,
  trash: (
    <>
      <path d="M3.5 6.5h17" />
      <path d="M18.5 6.5 17.6 20a2 2 0 0 1-2 1.9H8.4a2 2 0 0 1-2-1.9L5.5 6.5" />
      <path d="M9.5 6.5V4.6a1.6 1.6 0 0 1 1.6-1.6h1.8a1.6 1.6 0 0 1 1.6 1.6v1.9" />
      <path d="M10.5 11v6M13.5 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20.5h8.5" />
      <path d="M16.6 3.4a2.1 2.1 0 0 1 3 3L8.4 17.6 4 19l1.4-4.4z" />
    </>
  ),
  save: (
    <>
      <path d="M19 21.5H5a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2h11l5 5v12a2 2 0 0 1-2 2z" />
      <path d="M16.5 21.5v-7.5h-9v7.5M7.5 2.5V7h7" />
    </>
  ),
  link: (
    <>
      <path d="M10.5 13.5a4.5 4.5 0 0 0 6.4 0l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
      <path d="M13.5 10.5a4.5 4.5 0 0 0-6.4 0l-2.6 2.6a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </>
  ),
  "external-link": (
    <>
      <path d="M14.5 3.5H20.5v6" />
      <path d="M10 14 20.5 3.5" />
      <path d="M19 14v5.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h5.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6.3 5.5 12 5.5 21.5 12 21.5 12 17.7 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  logout: (
    <>
      <path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16.5 16.5 4.5-4.5-4.5-4.5M21 12H9.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.9-6.4" />
      <path d="M20.5 3.5v5.5H15" />
    </>
  ),
  menu: <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />,
  sidebar: (
    <>
      <rect x="3" y="3.5" width="18" height="17" rx="2.5" />
      <path d="M9.5 3.5v17" />
    </>
  ),

  // Status & feedback
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16.5V11M12 8h.01" />
    </>
  ),
  warning: (
    <>
      <path d="M10.3 4 2.8 17.2A2 2 0 0 0 4.5 20.2h15a2 2 0 0 0 1.7-3l-7.5-13.2a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.2 12.3 2.6 2.6 5-5.1" />
    </>
  ),
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6M9 9l6 6" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5z" />
      <path d="M10.2 20.5a2 2 0 0 0 3.6 0" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  inbox: (
    <>
      <path d="M21.5 12.5H16l-1.8 2.8H9.8L8 12.5H2.5" />
      <path d="M6 5.2 2.5 12.5V19a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-6.5L18 5.2A2 2 0 0 0 16.2 4H7.8A2 2 0 0 0 6 5.2z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 21.5s7.5-3.6 7.5-9.5V5.4L12 2.5 4.5 5.4V12c0 5.9 7.5 9.5 7.5 9.5z" />
      <path d="m9.2 11.8 2.2 2.2 3.9-4" />
    </>
  ),

  // Domain / feature
  sparkles: (
    <>
      <path d="m11 3.5 1.7 4.4 4.4 1.7-4.4 1.7L11 15.7 9.3 11.3 4.9 9.6l4.4-1.7z" />
      <path d="m18.5 15.5.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    </>
  ),
  palette: (
    <>
      <path d="M12 21.5a9.5 9.5 0 1 1 9.5-9.5c0 2.3-1.9 3.6-3.8 3.6h-1.4a2.3 2.3 0 0 0-1.7 3.9 1.9 1.9 0 0 1-1.4 2z" />
      <path d="M7.5 11h.01M10 7.5h.01M14.5 7.8h.01" />
    </>
  ),
  type: <path d="M4.5 7V4.5h15V7M12 4.5V19.5M9 19.5h6" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10.5h18" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M20 10.5c0 6-8 11-8 11s-8-5-8-11a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10.5" r="3" />
    </>
  ),
  mail: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3.5 7.5 8.5 5.5 8.5-5.5" />
    </>
  ),
  phone: (
    <path d="M21.5 17v2.6a2 2 0 0 1-2.2 2 19.4 19.4 0 0 1-8.5-3 19.2 19.2 0 0 1-5.9-5.9A19.4 19.4 0 0 1 2.9 4.2 2 2 0 0 1 4.9 2h2.6a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8.5 9.5a15.8 15.8 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2z" />
  ),
  message: (
    <path d="M21 14.5a2 2 0 0 1-2 2H8l-5 4v-15a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  file: (
    <>
      <path d="M14.5 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7.5z" />
      <path d="M14.5 2.5v5h5M8.5 13h7M8.5 16.5h4.5" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="8" width="18" height="4.5" rx="1.5" />
      <path d="M4.5 12.5V19a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6.5M12 8v13" />
      <path d="M8.2 8a2.7 2.7 0 0 1 0-5.5C11.4 2.5 12 8 12 8s.6-5.5 3.8-5.5a2.7 2.7 0 0 1 0 5.5" />
    </>
  ),
  diamond: <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" />,
  crown: <path d="m2.5 18.5 2-10 5.2 4.2L12 5l2.3 7.7 5.2-4.2 2 10z" />,
  zap: <path d="M13 2.5 4 14h7l-1 7.5L20 10h-7z" />,
  cloud: (
    <path d="M17.2 19.5a4.75 4.75 0 0 0 .3-9.5 6.25 6.25 0 0 0-12-1.4A3.75 3.75 0 0 0 6.2 19.5z" />
  ),
  cog: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.6M12 18.9v2.6M4.9 4.9l1.9 1.9M17.2 17.2l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.9 19.1l1.9-1.9M17.2 6.8l1.9-1.9" />
    </>
  ),
  chart: <path d="M3.5 21h17M7.5 21V11M12 21V4.5M16.5 21v-7" />,
  flag: (
    <>
      <path d="M4.5 15.5s1.2-1 4-1 5.2 2 8 2 3.5-1 3.5-1V4s-.7 1-3.5 1-5.2-2-8-2-4 1-4 1z" />
      <path d="M4.5 21.5v-6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6.5" />
      <path d="M8.6 14.7 7.5 21.5l4.5-2.4 4.5 2.4-1.1-6.8" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6 14.5h3" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="9" width="4" height="12" rx="1" />
      <circle cx="5" cy="4.5" r="2" />
      <path d="M11 21V9h4v1.7A4.3 4.3 0 0 1 21 14v7h-4v-6.4a2.1 2.1 0 0 0-4.2 0V21z" />
    </>
  ),
} as const;

export type IconName = keyof typeof P;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  /** 13–14 inline · 16 controls · 18 buttons · 20 navigation · 24 empty states. */
  size?: number;
}

export function Icon({ name, size = 18, strokeWidth = 1.75, className = "", ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...rest}
    >
      {P[name]}
    </svg>
  );
}
