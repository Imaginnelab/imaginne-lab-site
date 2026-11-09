import { NavigationLink, NavigationProgress } from '@/components/navigation/NavigationLink';
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
          <NavigationLink className="header-orders" href={localePath(locale, '/orders')} aria-label={copy.orders} title={copy.orders}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 4h10l4 5v11H3V9Zm-4 5h18M12 4v5M8 13h8m-8 4h5" />
            </svg>
            <span className="header-orders-label">{copy.orders}</span>
          </NavigationLink>
          <CartButton label={cartLabel} />
          <AccountButton locale={locale} />
          <MobileNav label={mobile.toggle} />
        </div>
        <NavigationProgress />
      </div>
    </header>
  );
}
