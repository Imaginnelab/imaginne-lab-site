import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { BulbMascot } from '../Mascot';

type Props = { locale: Locale; anchors: Dictionary['anchors']; copy: Dictionary['home']['contact']  };

// The page ends with the mascot waving next to a speech bubble that holds one question and the
// order button. Pointing at the button gets it waving faster, sparks lit.
export function Contact({ anchors, copy }: Props) {
  return (
    <section className="section cta-band" id={anchors.contact}>
      <div className="wrap cta-stage">
        <BulbMascot className="cta-mascot" />
        <div className="cta-bubble">
          <h2>{copy.text001}</h2>
          <a className="btn btn-primary" href="https://www.instagram.com/imaginne.lab/" target="_blank" rel="noopener">
            {copy.text003}
            <svg className="icon" viewBox="0 0 256 256" aria-hidden="true">
              <path fill="currentColor" d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
