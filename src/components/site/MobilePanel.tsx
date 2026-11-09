import { NavigationLink } from '@/components/navigation/NavigationLink';
import { SectionLink } from '@/components/navigation/SectionLink';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { LanguageList } from './LanguageSwitcher';
type Props = { locale: Locale; anchors: Dictionary['anchors']; copy: Dictionary['site']['mobilePanel'] ; language: Dictionary['site']['language'] };

export function MobilePanel({ locale, anchors, copy, language }: Props) {
  return (
    <div className="mobile-panel" id="mobile-panel" inert>
      <NavigationLink href={localePath(locale, '/products')}>
        {copy.text001}
      </NavigationLink>
      <SectionLink href={localePath(locale) + "#"+anchors.process}>
        {copy.text002}
      </SectionLink>
      <SectionLink href={localePath(locale) + "#"+anchors.customization}>
        {copy.text003}
      </SectionLink>
      <SectionLink href={localePath(locale) + "#"+anchors.contact}>
        {copy.text004}
      </SectionLink>
      <a className="btn btn-primary" href="https://www.instagram.com/imaginne.lab/" target="_blank" rel="noopener">
        {copy.text005}
      </a>
      <LanguageList locale={locale} copy={language} />
    </div>
  );
}
