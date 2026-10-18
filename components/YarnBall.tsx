/**
 * A ball of cotton yarn, drawn in SVG (no image to load).
 * `color` is any CSS color, e.g. "var(--yarn-rose)".
 */
export default function YarnBall({
  color,
  size = 64,
  tail = true,
  className = "",
}: {
  color: string;
  size?: number;
  tail?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={`yarn-ball ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      style={{ color }}
    >
      {tail && (
        <path
          d="M98 86c10 8 14 18 6 24s-22 0-30 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}
      <circle cx="58" cy="58" r="46" fill="currentColor" />
      {/* Wraps of yarn around the ball */}
      <g fill="none" strokeWidth="3.2" strokeLinecap="round" stroke="rgb(0 0 0 / 13%)">
        <path d="M20 40c20 10 56 10 78-6" />
        <path d="M14 58c26 12 64 12 88-4" />
        <path d="M20 78c22 10 54 10 74-4" />
        <path d="M44 14c-14 22-14 64 2 88" />
        <path d="M66 13c-12 26-12 62 4 90" />
      </g>
      <g fill="none" strokeWidth="2.4" strokeLinecap="round" stroke="rgb(255 255 255 / 55%)">
        <path d="M28 30c12-8 26-12 40-10" />
        <path d="M22 48c8-12 18-18 28-20" />
      </g>
    </svg>
  );
}

/** Cotton color for each category (see --yarn-* in globals.css). */
export const yarnColors = ["rose", "butter", "mint", "lilac", "sky", "peach"] as const;
export type YarnColor = (typeof yarnColors)[number];
