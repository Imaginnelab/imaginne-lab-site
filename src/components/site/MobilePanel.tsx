import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { LanguageList } from './LanguageSwitcher';
type Props = { locale: Locale; anchors: Dictionary['anchors']; copy: Dictionary['site']['mobilePanel'] ; language: Dictionary['site']['language'] };

export function MobilePanel({ locale, anchors, copy, language }: Props) {
  return (
    <div className="mobile-panel" id="mobile-panel" inert>
      <a href={localePath(locale) + "#"+anchors.products}>
        {copy.text001}
      </a>
      <a href={localePath(locale) + "#"+anchors.process}>
        {copy.text002}
      </a>
      <a href={localePath(locale) + "#"+anchors.customization}>
        {copy.text003}
      </a>
      <a href={localePath(locale) + "#"+anchors.contact}>
        {copy.text004}
      </a>
      <a className="btn btn-primary" href="https://www.instagram.com/imaginne.lab/" target="_blank" rel="noopener">
        {copy.text005}
      </a>
      <LanguageList locale={locale} copy={language} />
    </div>
  );
}
