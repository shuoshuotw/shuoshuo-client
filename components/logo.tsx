/** The mark in assets/shuoshuo-favicon.svg: two right-angle brackets and the two red strokes. The brackets follow the text colour. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg className="logo" viewBox="14 14 92 92" width={size} height={size} aria-hidden="true">
      <g fill="none" strokeWidth="12" strokeLinecap="butt" strokeLinejoin="miter" stroke="currentColor">
        <path d="M20 26H94V48" />
        <path d="M26 72V94H100" />
      </g>
      {/* Two paths with a unit length, so a press can lift each stroke off and write it again (speakLogo) */}
      <g fill="none" strokeWidth="12" strokeLinecap="butt" stroke="var(--brand-red)">
        <path className="logo-stroke" pathLength={1} d="M50 40V64" />
        <path className="logo-stroke" pathLength={1} d="M70 40V80" />
      </g>
    </svg>
  );
}

/** One corner of the frame around a quote, drawn with the logo's stroke: ┌ opens it, ┘ closes it. */
export function Bracket({ end = false }: { end?: boolean }) {
  return (
    <svg className={end ? "bracket bracket-close" : "bracket bracket-open"} viewBox="0 0 40 40" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="butt" strokeLinejoin="miter" d={end ? "M37.5 2V37.5H2" : "M2.5 38V2.5H38"} />
    </svg>
  );
}
