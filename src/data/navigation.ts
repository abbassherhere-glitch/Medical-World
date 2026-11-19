/** Main menu in the site header, in order. */
export const MAIN_MENU = [
  { label: 'All professions', href: '/professions/' },
  { label: 'Schools', href: '/schools/' },
  { label: 'Salaries', href: '/salaries/' },
  { label: 'Licensing', href: '/licensing/' },
  { label: 'About', href: '/about/' },
] as const;

/** Footer columns for the site's own pages. */
export const FOOTER_ABOUT = [
  { label: 'Who we are', href: '/about/' },
  { label: 'Editorial standards', href: '/editorial-standards/' },
  { label: 'How we make money', href: '/how-we-make-money/' },
  { label: 'Contact', href: '/contact/' },
] as const;

export const FOOTER_LEGAL = [
  { label: 'Advertising disclosure', href: '/advertising-disclosure/' },
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Terms of use', href: '/terms/' },
] as const;
