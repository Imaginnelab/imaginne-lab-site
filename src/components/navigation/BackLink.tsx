import { NavigationLink } from './NavigationLink';

export function BackLink({ href, label }: { href: string; label: string }) {
  return <NavigationLink href={href} className="page-back" aria-label={label} title={label}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5m7-7-7 7 7 7" />
    </svg>
  </NavigationLink>;
}
