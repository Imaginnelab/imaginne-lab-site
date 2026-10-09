import { AccountMenu } from '@/components/account/AccountMenu';
import { getAccountDictionary } from '@/i18n/account-dictionaries';
import { htmlLang, type Locale } from '@/i18n/config';
import { accountView } from '@/lib/auth/profile';
import { getCurrentUser, isUnderMaintenance } from '@/lib/dal';
import { MaintenanceBanner } from './MaintenanceBanner';
import '@/styles/maintenance.css';

// Maintenance as a real block: while it is on, the server sends the site only to
// administrators. Everyone else gets the maintenance screen and nothing of the page behind it.
export async function MaintenanceGate({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  if (!(await isUnderMaintenance())) return <>{children}</>;

  const [user, dictionary] = await Promise.all([getCurrentUser(), getAccountDictionary(locale)]);
  const t = dictionary.maintenance;
  const adminHref = `/admin/?lang=${locale}`;

  if (user?.isAdmin) {
    return (
      <>
        {children}
        <MaintenanceBanner label={t.bannerLabel} text={t.banner} link={t.bannerLink} href={adminHref} />
      </>
    );
  }

  return (
    <main className="maintenance-curtain" aria-labelledby="maintenance-title" lang={htmlLang[locale]}>
      <div className="maintenance-card">
        {/* eslint-disable-next-line @next/next/no-img-element -- a 2 KB SVG logo, same markup as before */}
        <img className="maintenance-logo" src="/assets/img/logo-icon.svg" alt="Imaginne Lab" width={72} height={72} />
        <p className="maintenance-eyebrow">{t.eyebrow}</p>
        <h1 className="maintenance-title" id="maintenance-title">{t.title}</h1>
        <p className="maintenance-text">{t.text}</p>
        <p className="maintenance-notice" role="status" aria-live="polite">{user ? t.notAdmin : ''}</p>
        <AccountMenu user={accountView(user)} t={dictionary.account} locale={locale} adminHref={adminHref} variant="maintenance" label={t.login} />
      </div>
    </main>
  );
}
