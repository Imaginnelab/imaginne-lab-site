// The brand mascot: the logo's light bulb with a face, a forest screw base, the logo's amber
// filament, idea sparks over its head and a waving right arm. Drawn in the custom-order scene's
// coordinates (head around 500,264), so it drops into that SVG as is; elsewhere, use BulbMascot.
// The scene-* classes carry its float, wave, blink and spark animations.
export function MascotShapes({ gradientId }: { gradientId: string }) {
  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F3EAD0" />
        </linearGradient>
      </defs>
      <g className="scene-sparks" stroke="#FFCB29" strokeWidth="7" strokeLinecap="round">
        <path d="M500 120v-24" /><path d="M452 132l-15-19" /><path d="M548 132l15-19" /><path d="M418 164l-21-10" /><path d="M582 164l21-10" />
      </g>
      <path d="M402 300q-22 18-18 38" fill="none" stroke="#343D30" strokeWidth="10" strokeLinecap="round" />
      <circle cx="386" cy="342" r="11" fill="#FFFFFF" stroke="#343D30" strokeWidth="5" />
      <g className="scene-wave">
        <path d="M594 292q36-22 40-58" fill="none" stroke="#343D30" strokeWidth="10" strokeLinecap="round" />
        <circle cx="635" cy="228" r="12" fill="#FFFFFF" stroke="#343D30" strokeWidth="5" />
      </g>
      <path d="M452 380c0-36-48-62-50-116a98 98 0 1 1 196 0c-2 54-50 80-50 116Z" fill={`url(#${gradientId})`} stroke="#343D30" strokeWidth="7" strokeLinejoin="round" />
      <path d="M436 214a72 72 0 0 1 46-46" fill="none" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" opacity=".9" />
      <rect x="494" y="300" width="12" height="62" rx="6" fill="#FFCB29" />
      <ellipse cx="447" cy="268" rx="12" ry="7" fill="#F2A7B8" opacity=".6" />
      <ellipse cx="553" cy="268" rx="12" ry="7" fill="#F2A7B8" opacity=".6" />
      <g className="scene-eyes">
        <ellipse cx="470" cy="242" rx="11" ry="14" fill="#1C2118" />
        <ellipse cx="530" cy="242" rx="11" ry="14" fill="#1C2118" />
        <circle cx="474" cy="236" r="4" fill="#FFFFFF" />
        <circle cx="534" cy="236" r="4" fill="#FFFFFF" />
      </g>
      <path d="M480 270q20 20 40 0" fill="none" stroke="#1C2118" strokeWidth="5" strokeLinecap="round" />
      <rect x="454" y="374" width="92" height="17" rx="7" fill="#343D30" />
      <rect x="459" y="393" width="82" height="15" rx="7" fill="#343D30" />
      <rect x="465" y="410" width="70" height="15" rx="7" fill="#343D30" />
      <rect x="483" y="427" width="34" height="12" rx="6" fill="#1B2118" />
    </>
  );
}

// The mascot on its own, framed around it. Decorative: the text next to it carries the meaning.
export function BulbMascot({ className = '' }: { className?: string }) {
  return (
    <svg className={'mascot ' + className} viewBox="366 84 290 438" aria-hidden="true" focusable="false">
      <ellipse className="scene-shadow" cx="506" cy="512" rx="74" ry="9" fill="#1C2118" opacity=".12" />
      <g className="scene-mascot"><MascotShapes gradientId="mascot-glass" /></g>
    </svg>
  );
}
