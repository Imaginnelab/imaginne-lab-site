import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { AccountButton } from '@/components/account/AccountButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { MobileNav } from './MobileNav';
type Props = { locale: Locale; anchors: Dictionary['anchors']; copy: Dictionary['site']['header'] ; language: Dictionary['site']['language']; theme: Dictionary['site']['theme']; mobile: Dictionary['site']['mobile'] };

export function Header({ locale, anchors, copy, language, theme, mobile }: Props) {
  return (
    <header className="nav">
      <div className="wrap">
        <a className="brand" href={localePath(locale) + "#"+anchors.top}>
          <img src="/assets/img/logo-icon.svg" alt={copy.alt001} />
          <span>
            {' '}{copy.text001}{' '}
            <small>
              {copy.text002}
            </small>
          </span>
        </a>
        <nav className="nav-links">
          <a href={localePath(locale) + "#"+anchors.products}>
            {copy.text003}
          </a>
          <a href={localePath(locale) + "#"+anchors.process}>
            {copy.text004}
          </a>
          <a href={localePath(locale) + "#"+anchors.customization}>
            {copy.text005}
          </a>
          <a href={localePath(locale) + "#"+anchors.contact}>
            {copy.text006}
          </a>
        </nav>
        <div className="nav-actions">
          <LanguageSwitcher locale={locale} copy={language} />
          <ThemeToggle label={theme.toggle} />
          <AccountButton locale={locale} />
          <MobileNav label={mobile.toggle} />
        </div>
      </div>
    </header>
  );
}
