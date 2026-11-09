import type { Dictionary } from '@/i18n/dictionaries';

type Copy = Dictionary['home']['customization'];

// The custom-order scene: an order card where a "Sofia" nameplate is printed layer by layer
// under the site's nozzle, with its colour, size and engraving, and the brand's light bulb as a
// mascot leaning on it. One SVG, so it stays sharp at any size; it moves only once the section
// is in view (see .spotlight.is-visible) and never with reduced motion.
export function CustomizationScene({ copy }: { copy: Copy }) {
  return (
    <svg className="scene" viewBox="0 0 640 560" role="img" aria-label={copy.alt001}>
      <defs>
        <filter id="scene-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#1C2118" floodOpacity=".14" />
        </filter>
        <linearGradient id="scene-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F3EAD0" />
        </linearGradient>
      </defs>

      {/* The order card */}
      <g filter="url(#scene-shadow)">
        <rect x="40" y="60" width="360" height="460" rx="28" fill="#FFFFFF" />
      </g>
      <rect x="68" y="88" width="196" height="30" rx="15" fill="#EEF2E6" />
      <circle cx="87" cy="103" r="9" fill="#343D30" />
      <path d="m82.5 103 3 3 5.5-6" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text className="scene-chip" x="103" y="108">{copy.sceneStatus}</text>
      <rect x="68" y="196" width="168" height="8" rx="4" fill="#FFCB29" />
      <text className="scene-title" x="68" y="162">{copy.sceneTitle1}</text>
      <text className="scene-title scene-title-accent" x="68" y="196">{copy.sceneTitle2}</text>

      {/* The print bed, with the nameplate being printed */}
      <rect x="68" y="222" width="304" height="134" rx="18" fill="#F1EEE2" />
      <g className="scene-plate">
        <text className="scene-name" x="220" y="308" textAnchor="middle">Sofia</text>
        <rect x="120" y="318" width="200" height="16" rx="6" fill="#343D30" />
      </g>
      <rect className="scene-cover" x="96" y="238" width="248" height="98" fill="#F1EEE2" />
      <g className="scene-head">
        <g className="scene-sweep">
          <path d="M-10 -24h20v13h-20zM-6 -11h12l-6 8z" fill="#343D30" />
          <circle cx="0" cy="-1.5" r="2.4" fill="#FFCB29" />
        </g>
      </g>

      {/* Options */}
      <path d="M68 380h304M68 422h304M68 464h304" stroke="rgba(28,33,24,.1)" strokeWidth="1.5" />
      <text className="scene-label" x="68" y="406">{copy.sceneColor}</text>
      <circle cx="270" cy="401" r="13" fill="none" stroke="#343D30" strokeWidth="2" />
      <circle cx="270" cy="401" r="9" fill="#FFCB29" />
      <circle cx="298" cy="401" r="9" fill="#343D30" />
      <circle cx="326" cy="401" r="9" fill="#F2A7B8" />
      <circle cx="354" cy="401" r="9" fill="#FFFFFF" stroke="rgba(28,33,24,.25)" strokeWidth="1.5" />
      <text className="scene-label" x="68" y="448">{copy.sceneSize}</text>
      <text className="scene-value" x="372" y="448" textAnchor="end">12 cm</text>
      <text className="scene-label" x="68" y="490">{copy.sceneEngraving}</text>
      <text className="scene-value scene-value-script" x="372" y="491" textAnchor="end">Sofia</text>

      {/* The mascot: the logo's light bulb */}
      <ellipse className="scene-shadow" cx="506" cy="512" rx="74" ry="10" fill="#1C2118" opacity=".12" />
      <g className="scene-mascot">
        <g className="scene-sparks" stroke="#FFCB29" strokeWidth="7" strokeLinecap="round">
          <path d="M500 120v-24" /><path d="M452 132l-15-19" /><path d="M548 132l15-19" /><path d="M418 164l-21-10" /><path d="M582 164l21-10" />
        </g>
        <path d="M402 300q-22 18-18 38" fill="none" stroke="#343D30" strokeWidth="10" strokeLinecap="round" />
        <circle cx="386" cy="342" r="11" fill="#FFFFFF" stroke="#343D30" strokeWidth="5" />
        <g className="scene-wave">
          <path d="M594 292q36-22 40-58" fill="none" stroke="#343D30" strokeWidth="10" strokeLinecap="round" />
          <circle cx="635" cy="228" r="12" fill="#FFFFFF" stroke="#343D30" strokeWidth="5" />
        </g>
        <path d="M452 380c0-36-48-62-50-116a98 98 0 1 1 196 0c-2 54-50 80-50 116Z" fill="url(#scene-glass)" stroke="#343D30" strokeWidth="7" strokeLinejoin="round" />
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
      </g>
    </svg>
  );
}
