import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
type Props = { locale: Locale; anchors: Dictionary['anchors']; copy: Dictionary['home']['hero']  };

const arrow = "M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z";

// The hero is a room: the product photo takes the right of the section (and runs up behind
// the header), fading into the page colour on the side of the text and at the bottom.
export function Hero({ locale, anchors, copy }: Props) {
  return (
    <section className="hero hero-ambient">
      <div className="hero-media">
        <picture>
          <source media="(max-width: 900px)" type="image/webp" sizes="min(92vw, 420px)"
            srcSet="/assets/img/hero-scene-square-600.webp 600w, /assets/img/hero-scene-square-960.webp 960w, /assets/img/hero-scene-square-1440.webp 1440w" />
          <img src="/assets/img/hero-scene-1300.webp"
            srcSet="/assets/img/hero-scene-900.webp 900w, /assets/img/hero-scene-1300.webp 1300w, /assets/img/hero-scene-1950.webp 1950w"
            sizes="clamp(580px, 46vw, 860px)" width={1300} height={941} alt={copy.alt001} fetchPriority="high" decoding="async" />
        </picture>
      </div>
      <div className="hero-badge">
        <svg className="icon" viewBox="0 0 256 256" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44L128,120,47.66,76ZM40,90l80,43.78v85.79L40,175.82Zm96,129.57V133.82L216,90v85.78Z">
          </path>
        </svg>
        <span>
          <strong>
            {copy.text008}
          </strong>
          <span>
            {copy.text009}
          </span>
        </span>
      </div>
      <div className="wrap">
        <div className="hero-copy" data-reveal="">
          <span className="eyebrow">
            {copy.text001}
          </span>
          {/* Two lines in every language: the highlighted word closes the first one. */}
          <h1>
            <span className="hero-line">
              {copy.text002}{' '}
              <em>
                {copy.text003}
              </em>
            </span>
            {' '}
            <span className="hero-line">
              {copy.text004}
            </span>
          </h1>
          <p className="lede">
            {copy.text005}
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="https://www.instagram.com/imaginne.lab/" target="_blank" rel="noopener">
              {' '}{copy.text006}{' '}
              <svg className="icon" viewBox="0 0 256 256">
                <path fill="currentColor" d={arrow}>
                </path>
              </svg>
            </a>
            <a className="btn btn-ghost" href={localePath(locale) + "#"+anchors.products}>
              {copy.text007}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
