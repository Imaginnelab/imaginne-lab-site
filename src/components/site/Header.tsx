import { NavigationLink } from '@/components/navigation/NavigationLink';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { AccountButton } from '@/components/account/AccountButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { MobileNav } from './MobileNav';
import { CartButton } from '@/components/cart/CartButton';
type Props = { locale: Locale; anchors: Dictionary['anchors']; copy: Dictionary['site']['header'] ; language: Dictionary['site']['language']; theme: Dictionary['site']['theme']; mobile: Dictionary['site']['mobile']; cartLabel: string };

export function Header({ locale, anchors, copy, language, theme, mobile, cartLabel }: Props) {
  return (
    <header className="nav">
      <div className="wrap">
        <NavigationLink className="brand" href={localePath(locale) + "#"+anchors.top}>
          <img src="/assets/img/logo-icon.svg" alt={copy.alt001} />
          <span>
            {' '}{copy.text001}{' '}
            <small>
              {copy.text002}
            </small>
          </span>
        </NavigationLink>
        <nav className="nav-links">
          <NavigationLink href={localePath(locale, '/products')}>
            {copy.text003}
          </NavigationLink>
          <NavigationLink href={localePath(locale) + "#"+anchors.process}>
            {copy.text004}
          </NavigationLink>
          <NavigationLink href={localePath(locale) + "#"+anchors.customization}>
            {copy.text005}
          </NavigationLink>
          <NavigationLink href={localePath(locale) + "#"+anchors.contact}>
            {copy.text006}
          </NavigationLink>
        </nav>
        <div className="nav-actions">
          <LanguageSwitcher locale={locale} copy={language} />
          <ThemeToggle label={theme.toggle} />
          <CartButton label={cartLabel} />
          <AccountButton locale={locale} />
          <MobileNav label={mobile.toggle} />
        </div>
      </div>
    </header>
  );
}
