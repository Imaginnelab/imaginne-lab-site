import { NavigationLink } from '@/components/navigation/NavigationLink';
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
          <source media="(max-width: 900px)" type="image/webp" sizes="(max-width: 900px) 92vw, 1px"
            srcSet="/assets/img/hero-brown-tall-480.webp 480w, /assets/img/hero-brown-tall-800.webp 800w, /assets/img/hero-brown-tall-1200.webp 1200w" />
          <img src="/assets/img/hero-brown-1300.webp"
            srcSet="/assets/img/hero-brown-900.webp 900w, /assets/img/hero-brown-1300.webp 1300w, /assets/img/hero-brown-1950.webp 1950w"
            sizes="min(62vw, 1180px)" width={1300} height={941} alt={copy.alt001} fetchPriority="high" decoding="async" />
        </picture>
      </div>
      <div className="wrap">
        <div className="hero-copy" data-reveal="">
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
            <NavigationLink className="btn btn-ghost" href={localePath(locale) + "#"+anchors.products}>
              {copy.text007}
            </NavigationLink>
          </div>
        </div>
      </div>
    </section>
  );
}
