import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { CustomizationScene } from './CustomizationScene';

type Props = { locale: Locale; anchors: Dictionary['anchors']; copy: Dictionary['home']['customization']  };

export function Customization({ anchors, copy }: Props) {
  return (
    <section className="section" id={anchors.customization}>
      <div className="wrap">
        <div className="spotlight" data-reveal="">
          <div className="inner">
            <div className="spotlight-copy">
              <h2>
                {copy.text002}
              </h2>
              <p>
                {copy.text003}
              </p>
              <ul className="spotlight-list">
                <li>
                  <svg className="icon" viewBox="0 0 256 256">
                    <path fill="currentColor" d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z">
                    </path>
                  </svg>
                  {' '}{copy.text004}{' '}
                </li>
                <li>
                  <svg className="icon" viewBox="0 0 256 256">
                    <path fill="currentColor" d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z">
                    </path>
                  </svg>
                  {' '}{copy.text005}{' '}
                </li>
                <li>
                  <svg className="icon" viewBox="0 0 256 256">
                    <path fill="currentColor" d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z">
                    </path>
                  </svg>
                  {' '}{copy.text006}{' '}
                </li>
              </ul>
              <div>
                <a className="btn btn-primary" href="https://www.instagram.com/imaginne.lab/" target="_blank" rel="noopener">
                  {copy.text007}
                </a>
              </div>
            </div>
            <div className="spotlight-visual">
              <CustomizationScene copy={copy} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
