import { getAccountDictionary } from '@/i18n/account-dictionaries';
import type { Locale } from '@/i18n/config';
import { accountView } from '@/lib/auth/profile';
import { getCurrentUser } from '@/lib/dal';
import { AccountMenu } from './AccountMenu';

// Header button: "Sign in" for visitors, the avatar with initials for whoever is signed in.
// The state comes from the server with the page, so there is nothing to wait for or to flash.
export async function AccountButton({ locale }: { locale: Locale }) {
  const [user, dictionary] = await Promise.all([getCurrentUser(), getAccountDictionary(locale)]);
  return <AccountMenu user={accountView(user)} t={dictionary.account} locale={locale} adminHref={`/admin/?lang=${locale}`} />;
}
