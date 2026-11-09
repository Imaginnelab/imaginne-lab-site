import Form from 'next/form';
import { NavigationLink } from '@/components/navigation/NavigationLink';
import { localePath, type Locale } from '@/i18n/config';
import type { OrderDictionary } from '@/i18n/order-dictionaries';
import { orderFilterStatuses, type AdminOrderFilters as FilterValues } from '@/lib/orders/filters';

export function AdminOrderFilters({ locale, values, copy, labels }: {
  locale: Locale; values: FilterValues; copy: OrderDictionary['admin']['filters']; labels: OrderDictionary['status'];
}) {
  return <Form action={localePath(locale, '/admin/orders')} className="order-filters" aria-label={copy.title}>
    <div><label htmlFor="order-filter-status">{copy.status}</label>
      <select id="order-filter-status" name="status" defaultValue={values.status}>
        {orderFilterStatuses.map((status) => <option value={status} key={status}>{status === 'all' ? copy.all : labels[status]}</option>)}
      </select></div>
    <div><label htmlFor="order-filter-from">{copy.from}</label><input id="order-filter-from" name="from" type="date" defaultValue={values.from} /></div>
    <div><label htmlFor="order-filter-to">{copy.to}</label><input id="order-filter-to" name="to" type="date" defaultValue={values.to} /></div>
    <div className="order-filter-actions"><button className="btn btn-primary btn-sm" type="submit">{copy.apply}</button>
      <NavigationLink className="btn btn-ghost btn-sm" href={localePath(locale, '/admin/orders')}>{copy.clear}</NavigationLink></div>
    <p className="order-help">{copy.timezone}</p>
  </Form>;
}
