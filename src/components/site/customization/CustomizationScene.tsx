import type { Dictionary } from '@/i18n/dictionaries';
import { MascotShapes } from '../Mascot';

type Copy = Dictionary['home']['customization'];

// The custom-order scene: an order card where a "Julia" nameplate is printed layer by layer
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
        <text className="scene-name" x="220" y="308" textAnchor="middle">Julia</text>
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
      <text className="scene-value scene-value-script" x="372" y="491" textAnchor="end">Julia</text>

      {/* The mascot: the logo's light bulb */}
      <ellipse className="scene-shadow" cx="506" cy="512" rx="74" ry="10" fill="#1C2118" opacity=".12" />
      <g className="scene-mascot"><MascotShapes gradientId="scene-glass" /></g>
    </svg>
  );
}
