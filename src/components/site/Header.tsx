import { NavigationLink, NavigationProgress } from '@/components/navigation/NavigationLink';
import { SectionLink } from '@/components/navigation/SectionLink';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { AccountButton } from '@/components/account/AccountButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileNav } from './MobileNav';
import { CartButton } from '@/components/cart/CartButton';
type Props = { locale: Locale; anchors: Dictionary['anchors']; copy: Dictionary['site']['header'] ; language: Dictionary['site']['language']; theme: Dictionary['site']['theme']; mobile: Dictionary['site']['mobile']; cartLabel: string };

// The theme toggle is off while the site is light only (see prepaint.js); 'theme' stays in the
// props so it can come back without touching the layouts. Orders live in the account menu.
export function Header({ locale, anchors, copy, language, mobile, cartLabel }: Props) {
  return (
    <header className="nav">
      <div className="wrap">
        <SectionLink className="brand" href={localePath(locale)}>
          <img src="/assets/img/logo-icon.svg" alt={copy.alt001} />
          <span>
            {' '}{copy.text001}{' '}
            <small>
              {copy.text002}
            </small>
          </span>
        </SectionLink>
        <nav className="nav-links">
          <NavigationLink href={localePath(locale, '/products')}>
            {copy.text003}
          </NavigationLink>
          <SectionLink href={localePath(locale) + "#"+anchors.process}>
            {copy.text004}
          </SectionLink>
          <SectionLink href={localePath(locale) + "#"+anchors.customization}>
            {copy.text005}
          </SectionLink>
          <SectionLink href={localePath(locale) + "#"+anchors.contact}>
            {copy.text006}
          </SectionLink>
        </nav>
        <div className="nav-actions">
          <LanguageSwitcher locale={locale} copy={language} />
          <CartButton label={cartLabel} />
          <AccountButton locale={locale} />
          <MobileNav label={mobile.toggle} />
        </div>
        <NavigationProgress />
      </div>
    </header>
  );
}
