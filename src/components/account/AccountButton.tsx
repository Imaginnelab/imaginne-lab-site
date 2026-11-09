import { getAccountDictionary } from '@/i18n/account-dictionaries';
import { localePath, type Locale } from '@/i18n/config';
import { accountView } from '@/lib/auth/profile';
import { getCurrentUser } from '@/lib/dal';
import { AccountMenu } from './AccountMenu';
import { AccountPopover } from './AccountPopover';

// Header button: "Sign in" for visitors (opens the sign-in dialog), the avatar with initials for
// whoever is signed in (opens the account menu). The state comes from the server with the page,
// so there is nothing to wait for or to flash.
export async function AccountButton({ locale }: { locale: Locale }) {
  const [user, dictionary] = await Promise.all([getCurrentUser(), getAccountDictionary(locale)]);
  const view = accountView(user);
  const adminHref = `/admin/?lang=${locale}`;
  if (view) return <AccountPopover user={view} t={dictionary.account} adminHref={adminHref} ordersHref={localePath(locale, '/orders')} />;
  return <AccountMenu user={null} t={dictionary.account} locale={locale} adminHref={adminHref} />;
}
