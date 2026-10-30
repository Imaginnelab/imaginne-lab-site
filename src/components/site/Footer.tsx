import { NavigationLink } from '@/components/navigation/NavigationLink';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

type Props = { locale: Locale; anchors: Dictionary['anchors']; copy: Dictionary['site']['footer']  };

export function Footer({ locale, anchors, copy }: Props) {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <NavigationLink className="brand" href={localePath(locale) + "#"+anchors.top}>
              <img src="/assets/img/logo-icon.svg" alt={copy.alt001} />
              <span>
                {copy.text001}
              </span>
            </NavigationLink>
            <p>
              {copy.text002}
            </p>
            <a className="footer-social" href="https://www.instagram.com/imaginne.lab/" target="_blank" rel="noopener">
              <svg className="icon" viewBox="0 0 256 256">
                <path fill="currentColor" d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160ZM176,24H80A56.06,56.06,0,0,0,24,80v96a56.06,56.06,0,0,0,56,56h96a56.06,56.06,0,0,0,56-56V80A56.06,56.06,0,0,0,176,24Zm40,152a40,40,0,0,1-40,40H80a40,40,0,0,1-40-40V80A40,40,0,0,1,80,40h96a40,40,0,0,1,40,40ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z">
                </path>
              </svg>
              {' '}{copy.text003}{' '}
            </a>
          </div>
          <div className="footer-col">
            <h4>
              {copy.text004}
            </h4>
            <ul>
              <li>
                <NavigationLink href={localePath(locale) + "#"+anchors.products}>
                  {copy.text005}
                </NavigationLink>
              </li>
              <li>
                <NavigationLink href={localePath(locale) + "#"+anchors.process}>
                  {copy.text006}
                </NavigationLink>
              </li>
              <li>
                <NavigationLink href={localePath(locale) + "#"+anchors.customization}>
                  {copy.text007}
                </NavigationLink>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>
              {copy.text008}
            </h4>
            <ul>
              <li>
                <NavigationLink href={localePath(locale) + "#"+anchors.products}>
                  {copy.text009}
                </NavigationLink>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>
              {copy.text010}
            </h4>
            <ul>
              <li>
                <a href="https://www.instagram.com/imaginne.lab/" target="_blank" rel="noopener">
                  {copy.text011}
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/imaginne.lab/" target="_blank" rel="noopener">
                  {copy.text012}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            {copy.text013}
          </span>
          <span>
            {copy.text014}
          </span>
        </div>
      </div>
    </footer>
  );
}
