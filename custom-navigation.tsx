'use client';

import { SubmissionResult, useForm } from '@conform-to/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { clsx } from 'clsx';
import debounce from 'lodash.debounce';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  SearchIcon,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import React, {
  forwardRef,
  Ref,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { useFormStatus } from 'react-dom';

import { FormStatus } from '@/vibes/soul/form/form-status';
import { Stream, Streamable } from '@/vibes/soul/lib/streamable';
import { Button } from '@/vibes/soul/primitives/button';
import { Logo } from '@/vibes/soul/primitives/logo';
import { Price } from '@/vibes/soul/primitives/price-label';
import { ProductCard } from '@/vibes/soul/primitives/product-card';
import { Link } from '~/components/link';
import { usePathname, useRouter } from '~/i18n/routing';
import { useSearch } from '~/lib/search';

interface Link {
  label: string;
  href: string;
  groups?: Array<{
    label?: string;
    href?: string;
    links: Array<{
      label: string;
      href: string;
    }>;
  }>;
}

interface Locale {
  id: string;
  label: string;
}

interface Currency {
  id: string;
  label: string;
}

type Action<State, Payload> = (
  state: Awaited<State>,
  payload: Awaited<Payload>,
) => State | Promise<State>;
export type SearchResult =
  | {
      type: 'products';
      title: string;
      products: Array<{
        id: string;
        title: string;
        href: string;
        price?: Price;
        image?: { src: string; alt: string };
      }>;
    }
  | {
      type: 'links';
      title: string;
      links: Array<{ label: string; href: string }>;
    };
type CurrencyAction = Action<SubmissionResult | null, FormData>;
type SearchAction<S extends SearchResult> = Action<
  {
    searchResults: S[] | null;
    lastResult: SubmissionResult | null;
    emptyStateTitle?: string;
    emptyStateSubtitle?: string;
  },
  FormData
>;

interface Props<S extends SearchResult> {
  className?: string;
  isFloating?: boolean;
  accountHref: string;
  cartCount?: Streamable<number | null>;
  cartHref: string;
  links: Streamable<Link[]>;
  linksPosition?: 'center' | 'left' | 'right';
  locales?: Locale[];
  activeLocaleId?: string;
  currencies?: Currency[];
  activeCurrencyId?: Streamable<string | undefined>;
  currencyAction?: CurrencyAction;
  logo?: Streamable<string | { src: string; alt: string } | null>;
  logoWidth?: number;
  logoHeight?: number;
  logoHref?: string;
  logoLabel?: string;
  mobileLogo?: Streamable<string | { src: string; alt: string } | null>;
  mobileLogoWidth?: number;
  mobileLogoHeight?: number;
  searchHref: string;
  searchParamName?: string;
  searchAction?: SearchAction<S>;
  searchInputPlaceholder?: string;
  searchSubmitLabel?: string;
  cartLabel?: string;
  accountLabel?: string;
  locationLabel?: string;
  locationHref?: string;
  openSearchPopupLabel?: string;
  searchLabel?: string;
  mobileMenuTriggerLabel?: string;
  switchCurrencyLabel?: string;
  username?: string; // Add username prop
}

const MobileMenuButton = forwardRef<
  React.ComponentRef<'button'>,
  { open: boolean } & React.ComponentPropsWithoutRef<'button'>
>(({ open, className, ...rest }, ref) => {
  return (
    <button
      {...rest}
      className={clsx(
        'group relative rounded-lg p-2 outline-0 ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors focus-visible:ring-2',
        className,
      )}
      ref={ref}
    >
      <div className="flex h-4 w-4 origin-center transform flex-col justify-between overflow-hidden transition-all duration-300">
        <div
          className={clsx(
            'h-px origin-left transform bg-[var(--nav-mobile-button-icon,hsl(var(--foreground)))] transition-all duration-300',
            open ? 'translate-x-10' : 'w-7',
          )}
        />
        <div
          className={clsx(
            'h-px transform rounded bg-[var(--nav-mobile-button-icon,hsl(var(--foreground)))] transition-all delay-75 duration-300',
            open ? 'translate-x-10' : 'w-7',
          )}
        />
        <div
          className={clsx(
            'h-px origin-left transform bg-[var(--nav-mobile-button-icon,hsl(var(--foreground)))] transition-all delay-150 duration-300',
            open ? 'translate-x-10' : 'w-7',
          )}
        />
        <div
          className={clsx(
            'absolute top-2 flex transform items-center justify-between bg-[var(--nav-mobile-button-icon,hsl(var(--foreground)))] transition-all duration-500',
            open ? 'w-12 translate-x-0' : 'w-0 -translate-x-10',
          )}
        >
          <div
            className={clsx(
              'absolute h-px w-4 transform bg-[var(--nav-mobile-button-icon,hsl(var(--foreground)))] transition-all delay-300 duration-500',
              open ? 'rotate-45' : 'rotate-0',
            )}
          />
          <div
            className={clsx(
              'absolute h-px w-4 transform bg-[var(--nav-mobile-button-icon,hsl(var(--foreground)))] transition-all delay-300 duration-500',
              open ? '-rotate-45' : 'rotate-0',
            )}
          />
        </div>
      </div>
    </button>
  );
});

MobileMenuButton.displayName = 'MobileMenuButton';

const navButtonClassName =
  'relative rounded-lg bg-[var(--nav-button-background,transparent)] p-1.5 text-[var(--nav-button-icon,hsl(var(--foreground)))] ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors focus-visible:outline-0 focus-visible:ring-2 @4xl:hover:bg-[var(--nav-button-background-hover,hsl(var(--contrast-100)))] @4xl:hover:text-[var(--nav-button-icon-hover,hsl(var(--foreground)))]';

const NavigationMenuRoot = NavigationMenu.Root;
const NavigationMenuItem = NavigationMenu.Item;
const NavigationMenuTrigger = NavigationMenu.Trigger;
const NavigationMenuContent = NavigationMenu.Content;
const NavigationMenuViewport = NavigationMenu.Viewport;

export const Navigation = forwardRef(function Navigation<S extends SearchResult>(
  {
    className,
    isFloating = false,
    cartHref,
    cartCount: streamableCartCount,
    accountHref,
    links: streamableLinks,
    logo: streamableLogo,
    logoHref = '/',
    logoLabel = 'Home',
    logoWidth = 200,
    logoHeight = 40,
    mobileLogo: streamableMobileLogo,
    mobileLogoWidth = 100,
    mobileLogoHeight = 40,
    linksPosition = 'center',
    activeLocaleId,
    locales,
    currencies: streamableCurrencies,
    activeCurrencyId: streamableActiveCurrencyId,
    currencyAction,
    searchHref,
    searchParamName = 'query',
    searchAction,
    searchInputPlaceholder,
    searchSubmitLabel,
    cartLabel = 'Cart',
    accountLabel = 'Profile',
    locationLabel = 'Location',
    locationHref = '/location',
    mobileMenuTriggerLabel = 'Toggle navigation',
    switchCurrencyLabel,
    username, // Add username prop
  }: Props<S>,
  ref: Ref<HTMLDivElement>,
) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [currentMobileView, setCurrentMobileView] = useState<
    { type: 'main' } | { type: 'category'; category: Link }
  >({ type: 'main' });
  const { setIsSearchOpen } = useSearch();
  const pathname = usePathname();

  // Calculate banner height on mount and when banner changes

  const calculateBannerHeight = useCallback(() => {
    // Try common banner selectors first (combined to a single query)
    const combinedSelector =
      '#announcement-bar, [data-promo-banner], .announcement-banner, [class*="banner"], [id*="banner"], [class*="promo"]';

    // Fallback: scan all divs for likely “announcement” content
    const banner =
      document.querySelector(combinedSelector) ??
      Array.from(document.querySelectorAll('div')).find((div) => {
        const text = div.textContent?.toLowerCase() ?? '';

        return (
          (text.includes('thanksgiving') || text.includes('discount')) && div.offsetHeight > 20
        );
      }) ??
      null;

    // Apply height (0 if none)
    setBannerHeight(banner?.getBoundingClientRect().height ?? 0);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setCurrentMobileView({ type: 'main' });
  }, [pathname, setIsSearchOpen]);

  useEffect(() => {
    function handleScroll() {
      setIsSearchOpen(false);
      setIsMobileMenuOpen(false);
    }

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [setIsSearchOpen]);

  // Calculate banner height on mount and when banner visibility changes
  useEffect(() => {
    // Initial calculation
    calculateBannerHeight();

    // Retry calculation after a short delay in case banner wasn't ready
    const retryTimeout = setTimeout(() => {
      calculateBannerHeight();
    }, 100);

    // Recalculate when banner might change (e.g., dismissed/shown)
    const observer = new MutationObserver(() => {
      calculateBannerHeight();
    });

    const banner = document.querySelector(
      '#announcement-bar, [data-promo-banner], .announcement-banner',
    );

    if (banner) {
      observer.observe(banner, { attributes: true, childList: true, subtree: true });
    }

    // Also listen for window resize
    window.addEventListener('resize', calculateBannerHeight);

    return () => {
      clearTimeout(retryTimeout);
      observer.disconnect();
      window.removeEventListener('resize', calculateBannerHeight);
    };
  }, [calculateBannerHeight]);

  // Also recalculate when mobile menu opens to ensure we have the latest height
  useEffect(() => {
    if (isMobileMenuOpen) {
      calculateBannerHeight();
    }
  }, [isMobileMenuOpen, calculateBannerHeight]);

  return (
    <NavigationMenuRoot
      className={clsx('relative mx-auto w-full max-w-screen-2xl @container', className)}
      delayDuration={0}
      onValueChange={() => setIsSearchOpen(false)}
      ref={ref}
    >
      {/* Use a vertical layout so we can place the search in a top row and the links on a second row */}
      <div
        className={clsx(
          'flex flex-col bg-[var(--nav-background,hsl(var(--background)))] transition-shadow @4xl:rounded-t-2xl @4xl:px-2 @4xl:pl-6 @4xl:pr-2.5',
          isFloating
            ? 'shadow-xl ring-1 ring-[var(--nav-floating-border,hsl(var(--foreground)/10%))]'
            : 'shadow-none ring-0',
        )}
      >
        {/* Top row: mobile menu, logo, icons (no search bar for mobile/tablet) */}
        <div className="flex items-center justify-between gap-1 py-2 pl-3 pr-2">
          {/* Mobile Menu */}
          <Dialog.Root onOpenChange={setIsMobileMenuOpen} open={isMobileMenuOpen}>
            <Dialog.Trigger asChild>
              <MobileMenuButton
                aria-label={mobileMenuTriggerLabel}
                className="mr-1 @4xl:hidden"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                open={isMobileMenuOpen}
              />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay
                className="bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                style={{
                  position: 'fixed',
                  top: `${bannerHeight}px`,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 40,
                }}
              />
              <Dialog.Content asChild>
                <div
                  className="w-full bg-[var(--nav-mobile-background,hsl(var(--background)))] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left md:w-1/2"
                  style={{
                    position: 'fixed',
                    top: `${bannerHeight}px`,
                    left: 0,
                    height: `calc(100vh - ${bannerHeight}px)`,
                    zIndex: 50,
                  }}
                >
                  <Dialog.Title className="sr-only">Navigation Menu</Dialog.Title>
                  <div className="h-full divide-y divide-[var(--nav-mobile-divider,hsl(var(--contrast-100)))] overflow-y-auto">
                    {/* Dynamic header - category navigation or simple close button */}
                    {currentMobileView.type === 'category' ? (
                      <div className="flex items-center justify-between border-b border-[var(--nav-mobile-divider,hsl(var(--contrast-100)))] p-4">
                        {/* Back button */}
                        <button
                          aria-label="Back to main menu"
                          className="rounded-lg p-1 text-[var(--nav-mobile-link-text,hsl(var(--foreground)))] transition-colors hover:bg-[var(--nav-mobile-link-background-hover,hsl(var(--contrast-100)))]"
                          onClick={() => setCurrentMobileView({ type: 'main' })}
                        >
                          <ChevronLeft size={20} />
                        </button>

                        {/* Centered category title */}
                        <h2 className="flex-1 text-center text-lg font-semibold text-[var(--nav-mobile-link-text,hsl(var(--foreground)))]">
                          {currentMobileView.category.label}
                        </h2>

                        {/* Close button */}
                        <Dialog.Close asChild>
                          <button
                            aria-label="Close menu"
                            className="rounded-lg p-1 text-[var(--nav-mobile-link-text,hsl(var(--foreground)))] transition-colors hover:bg-[var(--nav-mobile-link-background-hover,hsl(var(--contrast-100)))]"
                          >
                            <X size={20} />
                          </button>
                        </Dialog.Close>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2">
                        {/* Username in main view */}
                        {username ? (
                          <div className="flex items-center gap-2 px-3">
                            <User
                              className="text-[var(--nav-mobile-link-text,hsl(var(--foreground)))]"
                              size={20}
                              strokeWidth={1.5}
                            />
                            <span className="font-semibold text-[var(--nav-mobile-link-text,hsl(var(--foreground)))]">
                              {username}
                            </span>
                          </div>
                        ) : null}
                        <Dialog.Close asChild>
                          <button
                            aria-label="Close menu"
                            className="rounded-lg p-2 text-[var(--nav-mobile-link-text,hsl(var(--foreground)))] ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors hover:bg-[var(--nav-mobile-link-background-hover,hsl(var(--contrast-100)))] focus-visible:outline-0 focus-visible:ring-2"
                          >
                            <X size={20} />
                          </button>
                        </Dialog.Close>
                      </div>
                    )}
                    {/* Username is now in the header row */}
                    <Stream
                      fallback={
                        <ul className="flex animate-pulse flex-col gap-4 p-5 @4xl:gap-2 @4xl:p-5">
                          <li>
                            <span className="block h-4 w-10 rounded-md bg-contrast-100" />
                          </li>
                          <li>
                            <span className="block h-4 w-14 rounded-md bg-contrast-100" />
                          </li>
                          <li>
                            <span className="block h-4 w-24 rounded-md bg-contrast-100" />
                          </li>
                          <li>
                            <span className="block h-4 w-16 rounded-md bg-contrast-100" />
                          </li>
                        </ul>
                      }
                      value={streamableLinks}
                    >
                      {(links) => {
                        // Mobile navigation rendering
                        // Main menu view
                        if (currentMobileView.type === 'main') {
                          return (
                            <ul className="flex flex-col p-2 @4xl:gap-2 @4xl:p-5">
                              {links.map((item, i) => {
                                // Show chevron for any category that has groups
                                const hasSubcategories = item.groups && item.groups.length > 0;

                                return (
                                  <li key={i}>
                                    {item.label !== '' && (
                                      <div className="flex items-center justify-between">
                                        <Link
                                          className="font-[family-name:var(--nav-mobile-link-font-family,var,--font-family-body))] block flex-1 rounded-lg bg-[var(--nav-mobile-link-background,transparent)] px-3 py-2 font-semibold text-[var(--nav-mobile-link-text,hsl(var(--foreground)))] ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors hover:bg-[var(--nav-mobile-link-background-hover,hsl(var(--contrast-100)))] hover:text-[var(--nav-mobile-link-text-hover,hsl(var(--foreground)))] focus-visible:outline-0 focus-visible:ring-2 @4xl:py-4"
                                          href={item.href}
                                        >
                                          {item.label}
                                        </Link>
                                        {hasSubcategories && (
                                          <button
                                            aria-label={`View ${item.label} subcategories`}
                                            className="rounded-lg p-2 text-[var(--nav-mobile-link-text,hsl(var(--foreground)))] transition-colors hover:bg-[var(--nav-mobile-link-background-hover,hsl(var(--contrast-100)))]"
                                            onClick={() =>
                                              setCurrentMobileView({
                                                type: 'category',
                                                category: item,
                                              })
                                            }
                                          >
                                            <ChevronRight size={20} />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                              {/* Account and Logout options - only show when user is logged in */}
                              {username ? (
                                <>
                                  <li className="mt-4 border-t border-[var(--nav-mobile-divider,hsl(var(--contrast-100)))] pt-4">
                                    <div className="flex items-center justify-between">
                                      <Link
                                        className="font-[family-name:var(--nav-mobile-link-font-family,var,--font-family-body))] flex flex-1 items-center gap-2 rounded-lg bg-[var(--nav-mobile-link-background,transparent)] px-3 py-2 font-semibold text-[var(--nav-mobile-link-text,hsl(var(--foreground)))] ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors hover:bg-[var(--nav-mobile-link-background-hover,hsl(var(--contrast-100)))] hover:text-[var(--nav-mobile-link-text-hover,hsl(var(--foreground)))] focus-visible:outline-0 focus-visible:ring-2 @4xl:py-4"
                                        href={accountHref}
                                      >
                                        My Account
                                      </Link>
                                      <ChevronRight
                                        className="text-[var(--nav-mobile-link-text,hsl(var(--foreground)))]"
                                        size={20}
                                      />
                                    </div>
                                  </li>
                                  <li>
                                    <Link
                                      className="font-[family-name:var(--nav-mobile-link-font-family,var,--font-family-body))] block rounded-lg bg-[var(--nav-mobile-link-background,transparent)] px-3 py-2 font-semibold text-[var(--nav-mobile-link-text,hsl(var(--foreground)))] ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors hover:bg-[var(--nav-mobile-link-background-hover,hsl(var(--contrast-100)))] hover:text-[var(--nav-mobile-link-text-hover,hsl(var(--foreground)))] focus-visible:outline-0 focus-visible:ring-2 @4xl:py-4"
                                      href="/logout"
                                    >
                                      Log out
                                    </Link>
                                  </li>
                                </>
                              ) : null}
                            </ul>
                          );
                        }

                        // Category view
                        const category = currentMobileView.category;

                        return (
                          <div className="bg-[var(--nav-mobile-background,hsl(var(--background)))]">
                            {/* Subcategories */}
                            <ul className="flex flex-col p-2 @4xl:gap-2">
                              {(() => {
                                // First try to get links from groups
                                let subcategories =
                                  category.groups?.flatMap((group) => group.links) ?? [];

                                // If no links found, use the groups themselves as subcategories
                                if (subcategories.length === 0 && category.groups) {
                                  subcategories = category.groups
                                    // Make the label check a *type guard* so TS knows it's a string
                                    .filter(
                                      (group): group is typeof group & { label: string } =>
                                        typeof group.label === 'string' &&
                                        group.label.trim() !== '',
                                    )
                                    .map((group) => ({
                                      label: group.label,
                                      href: group.href ?? '#',
                                    }));
                                }

                                return subcategories.map((link, j) => (
                                  <li key={j}>
                                    <Link
                                      className="font-[family-name:var(--nav-mobile-sub-link-font-family,var,--font-family-body))] block rounded-lg bg-[var(--nav-mobile-sub-link-background,transparent)] px-3 py-2 text-sm font-medium text-[var(--nav-mobile-sub-link-text,hsl(var(--contrast-500)))] ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors hover:bg-[var(--nav-mobile-sub-link-background-hover,hsl(var(--contrast-100)))] hover:text-[var(--nav-mobile-sub-link-text-hover,hsl(var(--foreground)))] focus-visible:outline-0 focus-visible:ring-2 @4xl:py-4"
                                      href={link.href}
                                    >
                                      {link.label}
                                    </Link>
                                  </li>
                                ));
                              })()}
                              {/* Show message if no subcategories */}
                              {(() => {
                                // Check if we have any subcategories after processing
                                let hasSubcategories = false;

                                if (category.groups) {
                                  const linksFromGroups =
                                    category.groups.flatMap((g) => g.links).length > 0;
                                  const groupsAsSubcategories =
                                    category.groups.filter((g) => g.label && g.label !== '')
                                      .length > 0;

                                  hasSubcategories = linksFromGroups || groupsAsSubcategories;
                                }

                                return !hasSubcategories ? (
                                  <li className="px-3 py-2 text-sm text-[var(--nav-mobile-sub-link-text,hsl(var(--contrast-500)))]">
                                    No subcategories available
                                  </li>
                                ) : null;
                              })()}
                            </ul>
                          </div>
                        );

                        return null;
                      }}
                    </Stream>
                    {/* Language/Currency selector removed from mobile dialog for cleaner UX */}
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          {/* Logo */}
          <div className={clsx('flex items-center justify-start self-stretch @4xl:flex-none')}>
            <Logo
              className={clsx(streamableMobileLogo != null ? 'hidden @4xl:flex' : 'flex')}
              height={logoHeight}
              href={logoHref}
              label={logoLabel}
              logo={streamableLogo}
              width={logoWidth}
            />
            {streamableMobileLogo != null && (
              <Logo
                className="flex @4xl:hidden"
                height={mobileLogoHeight}
                href={logoHref}
                label={logoLabel}
                logo={streamableMobileLogo}
                width={mobileLogoWidth}
              />
            )}
          </div>
          {/* Search bar: only show inline for desktop */}
          <div className="hidden flex-1 justify-center px-2 @4xl:flex">
            <div className="box-border w-full max-w-full sm:max-w-[820px]">
              {searchAction ? (
                <SearchForm
                  searchAction={searchAction}
                  searchHref={searchHref}
                  searchInputPlaceholder={searchInputPlaceholder}
                  searchParamName={searchParamName}
                  searchSubmitLabel={searchSubmitLabel}
                />
              ) : null}
            </div>
          </div>
          {/* Icon Buttons (right side of top row) */}
          <div
            className={clsx(
              'flex items-center justify-end gap-0.5 transition-colors duration-300 @4xl:flex-none',
            )}
          >
            {/* Search icon removed for all views */}
            <Link
              aria-label={locationLabel}
              className="relative rounded-lg p-2 text-foreground ring-primary transition-colors hover:bg-contrast-100 hover:text-foreground focus-visible:outline-0 focus-visible:ring-2"
              href={locationHref}
            >
              <MapPin size={20} strokeWidth={1} />
            </Link>
            <Link
              aria-label={accountLabel}
              className="relative hidden rounded-lg p-2 text-foreground ring-primary transition-colors hover:bg-contrast-100 hover:text-foreground focus-visible:outline-0 focus-visible:ring-2 @4xl:inline-flex"
              href={accountHref}
            >
              <User size={20} strokeWidth={1} />
            </Link>
            <Link
              aria-label={cartLabel}
              className="relative rounded-lg p-2 text-foreground ring-primary transition-colors hover:bg-contrast-100 hover:text-foreground focus-visible:outline-0 focus-visible:ring-2"
              href={cartHref}
            >
              <ShoppingBag size={20} strokeWidth={1} />
              <Stream
                fallback={
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-contrast-100 text-xs text-background" />
                }
                value={streamableCartCount}
              >
                {(cartCount) =>
                  cartCount != null &&
                  cartCount > 0 && (
                    <span className="font-[family-name:var(--nav-cart-count-font-family,var,--font-family-body))] absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--nav-cart-count-background,hsl(var(--foreground)))] text-xs text-[var(--nav-cart-count-text,hsl(var(--background)))]">
                      {cartCount}
                    </span>
                  )
                }
              </Stream>
            </Link>
            {/* Locale / Language Dropdown */}
            {locales && locales.length > 1 ? (
              <LocaleSwitcher
                activeLocaleId={activeLocaleId}
                className="hidden @4xl:block"
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                locales={locales as [Locale, Locale, ...Locale[]]}
              />
            ) : null}
            {/* Currency Dropdown */}
            <Stream
              fallback={null}
              value={Streamable.all([streamableCurrencies, streamableActiveCurrencyId])}
            >
              {([currencies, activeCurrencyId]) =>
                currencies && currencies.length > 1 && currencyAction ? (
                  <CurrencyForm
                    action={currencyAction}
                    activeCurrencyId={activeCurrencyId}
                    className="hidden @4xl:block"
                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                    currencies={currencies as [Currency, ...Currency[]]}
                    switchCurrencyLabel={switchCurrencyLabel}
                  />
                ) : null
              }
            </Stream>
          </div>
        </div>
        {/* Search bar row for tablet/phone: below logo/icons, full width, centered */}
        <div className="flex w-full justify-center px-4 pb-2 @4xl:hidden">
          <div className="w-full">
            {searchAction ? (
              <SearchForm
                searchAction={searchAction}
                searchHref={searchHref}
                searchInputPlaceholder={searchInputPlaceholder}
                searchParamName={searchParamName}
                searchSubmitLabel={searchSubmitLabel}
              />
            ) : null}
          </div>
        </div>
      </div>
      {/* second row: top level nav links (desktop) */}
      <div
        className={clsx(
          'hidden w-full bg-[var(--nav-background,hsl(var(--background)))] @4xl:flex @4xl:rounded-b-2xl @4xl:px-2',
          isFloating
            ? 'shadow-xl ring-1 ring-[var(--nav-floating-border,hsl(var(--foreground)/10%))]'
            : 'shadow-none ring-0',
        )}
      >
        <ul
          className={clsx(
            'mx-auto flex w-full max-w-screen-2xl gap-10 @4xl:flex-1',
            {
              left: 'justify-start',
              center: 'justify-center',
              right: 'justify-end',
            }[linksPosition],
          )}
        >
          <Stream
            fallback={
              <ul className="flex min-h-[41px] animate-pulse flex-row items-center @4xl:gap-6 @4xl:p-2.5">
                <li>
                  <span className="block h-4 w-10 rounded-md bg-contrast-100" />
                </li>
                <li>
                  <span className="block h-4 w-14 rounded-md bg-contrast-100" />
                </li>
                <li>
                  <span className="block h-4 w-24 rounded-md bg-contrast-100" />
                </li>
                <li>
                  <span className="block h-4 w-16 rounded-md bg-contrast-100" />
                </li>
              </ul>
            }
            value={streamableLinks}
          >
            {(links) => {
              // Split categories: first 8 main, rest as children of "More"
              const mainCategories = links.slice(0, 8);
              const moreCategories = links.slice(8);
              const navLinks = [...mainCategories];

              if (moreCategories.length > 0) {
                navLinks.push({
                  label: 'More',
                  href: '#',
                  groups: [
                    {
                      label: '',
                      links: moreCategories.map(({ label, href }) => ({
                        label,
                        href,
                      })),
                    },
                  ],
                });
              }

              return navLinks.map((item, i) => (
                <NavigationMenuItem key={i} value={i.toString()}>
                  <NavigationMenuTrigger asChild>
                    <Link
                      className="hidden max-w-40 items-center whitespace-normal rounded-xl bg-[var(--nav-link-background,transparent)] p-2.5 text-center font-[family-name:var(--nav-link-font-family,var(--font-family-body))] text-sm font-medium text-[var(--nav-link-text,hsl(var(--foreground)))] ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors duration-200 hover:bg-[var(--nav-link-background-hover,hsl(var(--contrast-100)))] hover:text-[hsl(var(--primary))] focus-visible:outline-0 focus-visible:ring-2 @4xl:inline-flex"
                      href={item.href}
                    >
                      {item.label}
                      {/* Show chevron for More tab only */}
                      {item.label === 'More' && (
                        <ChevronDown className="ml-1" size={16} strokeWidth={1.5} />
                      )}
                    </Link>
                  </NavigationMenuTrigger>
                  {item.label === 'More' && (
                    // Use w-full instead of w-[100vw] to prevent horizontal overflow and unwanted scrollbar
                    <NavigationMenuContent className="absolute left-0 right-0 top-full z-50 -mt-1 w-full rounded-b-2xl rounded-t-none bg-[var(--nav-menu-background,hsl(var(--background)))] shadow-xl ring-1 ring-[var(--nav-menu-border,hsl(var(--foreground)/5%))]">
                      <div className="grid w-full max-w-screen-2xl grid-cols-6 gap-12 px-12 pb-12 pl-3 pt-8">
                        {/* Render each extra category as its own column */}
                        {item.groups?.[0]?.links?.map((link, idx) => (
                          <ul className="flex flex-col px-6" key={idx}>
                            {/* Category label as column header */}
                            <li>
                              <Link
                                className="block rounded-lg bg-transparent px-3 py-2 text-sm font-semibold text-foreground ring-primary transition-colors hover:bg-contrast-100 hover:text-foreground focus-visible:outline-0 focus-visible:ring-2"
                                href={link.href}
                              >
                                {link.label}
                              </Link>
                            </li>
                            {/* Render child categories if present */}
                            {links
                              .find((cat) => cat.label === link.label)
                              ?.groups?.map((childGroup, childIdx) => (
                                <React.Fragment key={childIdx}>
                                  {childGroup.label ? (
                                    <li>
                                      {childGroup.href ? (
                                        <Link
                                          className="block rounded-lg bg-transparent px-3 py-2 text-sm font-semibold text-foreground ring-primary transition-colors hover:bg-contrast-100 hover:text-foreground focus-visible:outline-0 focus-visible:ring-2"
                                          href={childGroup.href}
                                        >
                                          {childGroup.label}
                                        </Link>
                                      ) : (
                                        <span className="block rounded-lg bg-transparent px-3 py-2 text-sm font-semibold text-foreground ring-primary transition-colors hover:bg-contrast-100 hover:text-foreground focus-visible:outline-0 focus-visible:ring-2">
                                          {childGroup.label}
                                        </span>
                                      )}
                                    </li>
                                  ) : null}
                                  {childGroup.links.map((childLink, subIdx) => (
                                    <li key={subIdx}>
                                      <Link
                                        className="font-[family-name:var(--nav-sub-link-font-family,var,--font-family-body))] block rounded-lg bg-[var(--nav-sub-link-background,transparent)] px-3 py-1.5 text-sm font-medium text-[var(--nav-sub-link-text,hsl(var(--contrast-500)))] ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors hover:bg-[var(--nav-sub-link-background-hover,hsl(var(--contrast-100)))] hover:text-[var(--nav-sub-link-text-hover,hsl(var(--foreground)))] focus-visible:outline-0 focus-visible:ring-2"
                                        href={childLink.href}
                                      >
                                        {childLink.label}
                                      </Link>
                                    </li>
                                  ))}
                                </React.Fragment>
                              ))}
                          </ul>
                        ))}
                      </div>
                    </NavigationMenuContent>
                  )}
                  {/* ...existing code for normal categories... */}
                  {item.label !== 'More' && item.groups != null && item.groups.length > 0 && (
                    <NavigationMenuContent className="absolute left-0 right-0 top-full z-50 -mt-1 w-full rounded-b-2xl rounded-t-none bg-[var(--nav-menu-background,hsl(var(--background)))] shadow-xl ring-1 ring-[var(--nav-menu-border,hsl(var(--foreground)/5%))]">
                      <div className="m-auto grid w-full max-w-screen-lg grid-cols-5 justify-center gap-5 px-5 pb-8 pt-5">
                        {item.groups.map((group, columnIndex) => (
                          <ul className="flex flex-col" key={columnIndex}>
                            {group.label != null && group.label !== '' && (
                              <li>
                                {group.href != null && group.href !== '' ? (
                                  <Link
                                    className="block rounded-lg bg-transparent px-3 py-2 text-sm font-semibold text-foreground ring-primary transition-colors hover:bg-contrast-100 hover:text-foreground focus-visible:outline-0 focus-visible:ring-2"
                                    href={group.href}
                                  >
                                    {group.label}
                                  </Link>
                                ) : (
                                  <span className="block rounded-lg bg-transparent px-3 py-2 text-sm font-semibold text-foreground ring-primary transition-colors hover:bg-contrast-100 hover:text-foreground focus-visible:outline-0 focus-visible:ring-2">
                                    {group.label}
                                  </span>
                                )}
                              </li>
                            )}
                            {group.links.map((groupLink, groupIdx) => (
                              <li key={groupIdx}>
                                <Link
                                  className="font-[family-name:var(--nav-sub-link-font-family,var,--font-family-body))] block rounded-lg bg-[var(--nav-sub-link-background,transparent)] px-3 py-1.5 text-sm font-medium text-[var(--nav-sub-link-text,hsl(var(--contrast-500)))] ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors hover:bg-[var(--nav-sub-link-background-hover,hsl(var(--contrast-100)))] hover:text-[var(--nav-sub-link-text-hover,hsl(var(--foreground)))] focus-visible:outline-0 focus-visible:ring-2"
                                  href={groupLink.href}
                                >
                                  {groupLink.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ))}
                      </div>
                    </NavigationMenuContent>
                  )}
                </NavigationMenuItem>
              ));
            }}
          </Stream>
        </ul>
      </div>
      <div className="perspective-[2000px] absolute left-0 right-0 top-full z-50 flex w-full justify-center">
        <NavigationMenuViewport className="relative mt-2 w-full data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95" />
      </div>
    </NavigationMenuRoot>
  );
});
Navigation.displayName = 'Navigation';
// Provide a named alias so other components can import the custom navigation
// using the same `CustomNavigation` symbol used elsewhere in the codebase.
export const CustomNavigation = Navigation;

function SearchForm<S extends SearchResult>({
  searchAction,
  searchParamName = 'query',
  searchHref = '/search',
  searchInputPlaceholder = 'Search by product name, ID, SKU or description...',
  searchSubmitLabel = 'Submit',
}: {
  searchAction: SearchAction<S>;
  searchParamName?: string;
  searchHref?: string;
  searchInputPlaceholder?: string;
  searchSubmitLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const [isSearching, startSearching] = useTransition();
  const [{ searchResults, lastResult, emptyStateTitle, emptyStateSubtitle }, formAction] =
    useActionState(searchAction, {
      searchResults: null,
      lastResult: null,
    });
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPending = isSearching || isDebouncing || isSubmitting;
  const debouncedOnChange = useMemo(() => {
    const debounced = debounce((q: string) => {
      setIsDebouncing(false);

      const formData = new FormData();

      formData.append(searchParamName, q);
      startSearching(() => {
        formAction(formData);
      });
    }, 300);

    return (q: string) => {
      setIsDebouncing(true);
      debounced(q);
    };
  }, [formAction, searchParamName]);
  const [form] = useForm({ lastResult });
  const handleSubmit = useCallback(() => {
    setIsSubmitting(true);
  }, []);

  return (
    <>
      <form
        action={searchHref}
        className="mx-auto box-border flex h-[48px] w-full max-w-full items-center gap-2 rounded-[4px] border border-[var(--search-border)] px-4 lg:max-w-[820px]"
        onSubmit={handleSubmit}
      >
        <SearchIcon
          className="flex h-6 w-6 shrink-0 text-[var(--search-icon)]"
          height={24}
          size={24}
          strokeWidth={1}
          width={24}
        />
        <input
          className="placeholder:contrast-300 h-6 grow bg-transparent pl-3 text-lg font-medium leading-none outline-0 placeholder:text-[14px] placeholder:font-[400] placeholder:text-[var(--search-placeholder-text)] focus-visible:outline-none"
          name={searchParamName}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            debouncedOnChange(e.currentTarget.value);
          }}
          placeholder={searchInputPlaceholder}
          type="text"
          value={query}
        />
        {query.trim() !== '' ? (
          <SubmitButton
            className="h-[20px] w-[20px] p-0"
            loading={isPending}
            submitLabel={searchSubmitLabel}
          />
        ) : null}
      </form>
      <SearchResults
        emptySearchSubtitle={emptyStateSubtitle}
        emptySearchTitle={emptyStateTitle}
        errors={form.errors}
        query={query}
        searchParamName={searchParamName}
        searchResults={searchResults}
        stale={isPending}
      />
    </>
  );
}

function SubmitButton({
  loading,
  submitLabel,
  className,
}: {
  loading: boolean;
  submitLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className={className}
      loading={pending || loading}
      shape="circle"
      size="medium"
      type="submit"
      variant="secondary"
    >
      <ArrowRight aria-label={submitLabel} size={20} strokeWidth={1.5} />
    </Button>
  );
}

function SearchResults({
  query,
  searchResults,
  stale,
  emptySearchTitle = `No results were found for '${query}'`,
  emptySearchSubtitle = 'Please try another search.',
  errors,
}: {
  query: string;
  searchParamName: string;
  emptySearchTitle?: string;
  emptySearchSubtitle?: string;
  searchResults: SearchResult[] | null;
  stale: boolean;
  errors?: string[];
}) {
  if (query === '') return null;

  if (errors != null && errors.length > 0) {
    if (stale) return null;

    return (
      <div className="flex flex-col border-t border-[var(--nav-search-divider,hsl(var(--contrast-100)))] p-6">
        {errors.map((error) => (
          <FormStatus key={error} type="error">
            {error}
          </FormStatus>
        ))}
      </div>
    );
  }

  if (searchResults == null || searchResults.length === 0) {
    if (stale) return null;

    return (
      <div className="flex flex-col border-t border-[var(--nav-search-divider,hsl(var(--contrast-100)))] p-6">
        <p className="text-2xl font-medium text-[var(--nav-search-empty-title,hsl(var(--foreground)))]">
          {emptySearchTitle}
        </p>
        <p className="text-[var(--nav-search-empty-subtitle,hsl(var(--contrast-500)))]">
          {emptySearchSubtitle}
        </p>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex flex-1 flex-col overflow-y-auto border-t border-[var(--nav-search-divider,hsl(var(--contrast-100)))] @2xl:flex-row',
        stale && 'opacity-50',
      )}
    >
      {searchResults.map((result, index) => {
        switch (result.type) {
          case 'links': {
            return (
              <section
                aria-label={result.title}
                className="flex w-full flex-col gap-1 border-b border-[var(--nav-search-divider,hsl(var(--contrast-100)))] p-5 @2xl:max-w-80 @2xl:border-b-0 @2xl:border-r"
                key={`result-${index}`}
              >
                <h3 className="font-[family-name:var(--nav-search-result-title-font-family,var,--font-family-mono))] mb-4 text-sm uppercase text-[var(--nav-search-result-title,hsl(var(--foreground)))]">
                  {result.title}
                </h3>
                <ul role="listbox">
                  {result.links.map((link, i) => (
                    <li key={i}>
                      <Link
                        className="hover:text-[var(--nav-search-result-link-text-hover,hsl(var,--foreground)))] block rounded-lg bg-[var(--nav-search-result-link-background,transparent)] px-3 py-4 font-[family-name:var(--nav-search-result-link-font-family,var(--font-family-body))] font-semibold text-[var(--nav-search-result-link-text,hsl(var(--contrast-500)))] ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors hover:bg-[var(--nav-search-result-link-background-hover,hsl(var(--contrast-100)))] focus-visible:outline-0 focus-visible:ring-2"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          }

          case 'products': {
            return (
              <section
                aria-label={result.title}
                className="flex w-full flex-col gap-5 p-5"
                key={`result-${index}`}
              >
                <h3 className="font-[family-name:var(--nav-search-result-title-font-family,var,--font-family-mono))] text-sm uppercase text-[var(--nav-search-result-title,hsl(var(--foreground)))]">
                  {result.title}
                </h3>
                <ul
                  className="grid w-full grid-cols-2 gap-5 @xl:grid-cols-4 @2xl:grid-cols-2 @4xl:grid-cols-4"
                  role="listbox"
                >
                  {result.products.map((product) => (
                    <li key={product.id}>
                      <ProductCard
                        imageSizes="(min-width: 42rem) 25vw, 50vw"
                        product={{
                          id: product.id,
                          title: product.title,
                          href: product.href,
                          price: product.price,
                          image: product.image,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}

const useSwitchLocale = () => {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  return useCallback(
    (locale: string) =>
      router.push(
        // @ts-expect-error -- TypeScript will validate that only known `params`
        // are used in combination with a given `pathname`. Since the two will
        // always match for the current route, we can skip runtime checks.
        { pathname, params, query: Object.fromEntries(searchParams.entries()) },
        { locale },
      ),
    [pathname, params, router, searchParams],
  );
};

function LocaleSwitcher({
  locales,
  activeLocaleId,
  className,
}: {
  activeLocaleId?: string;
  locales: [Locale, ...Locale[]];
  className?: string;
}) {
  const activeLocale = locales.find((locale) => locale.id === activeLocaleId);
  const [isPending, startTransition] = useTransition();
  const switchLocale = useSwitchLocale();

  return (
    <div className={className}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          className={clsx(
            'flex items-center gap-1 text-xs uppercase transition-opacity disabled:opacity-30',
            navButtonClassName,
          )}
          disabled={isPending}
        >
          {activeLocale?.id ?? locales[0].id}
          <ChevronDown size={16} strokeWidth={1.5} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="z-50 max-h-80 overflow-y-scroll rounded-xl bg-[var(--nav-locale-background,hsl(var(--background)))] p-2 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 @4xl:w-32 @4xl:rounded-2xl @4xl:p-2"
            sideOffset={16}
          >
            {locales.map(({ id, label }) => (
              <DropdownMenu.Item
                className={clsx(
                  'font-[family-name:var(--nav-locale-link-font-family,var,--font-family-body))] hover:text-[var(--nav-locale-link-text-hover,hsl(var,--foreground)))] cursor-default rounded-lg bg-[var(--nav-locale-link-background,transparent)] px-2.5 py-2 text-sm font-medium text-[var(--nav-locale-link-text,hsl(var(--contrast-400)))] outline-none ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors hover:bg-[var(--nav-locale-link-background-hover,hsl(var(--contrast-100)))]',
                  {
                    'text-[var(--nav-locale-link-text-selected,hsl(var(--foreground)))]':
                      id === activeLocaleId,
                  },
                )}
                key={id}
                onSelect={() => startTransition(() => switchLocale(id))}
              >
                {label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

function CurrencyForm({
  action,
  currencies,
  activeCurrencyId,
  switchCurrencyLabel = 'Switch currency',
  className,
}: {
  activeCurrencyId?: string;
  action: CurrencyAction;
  currencies: [Currency, ...Currency[]];
  switchCurrencyLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastResult, formAction] = useActionState(action, null);
  const activeCurrency = currencies.find((currency) => currency.id === activeCurrencyId);

  useEffect(() => {
    // eslint-disable-next-line no-console
    if (lastResult?.error) console.log(lastResult.error);
  }, [lastResult?.error]);

  return (
    <div className={className}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          className={clsx(
            'flex items-center gap-1 text-xs uppercase transition-opacity disabled:opacity-30',
            navButtonClassName,
          )}
          disabled={isPending}
        >
          {activeCurrency?.label ?? currencies[0].label}
          <ChevronDown size={16} strokeWidth={1.5}>
            <title>{switchCurrencyLabel}</title>
          </ChevronDown>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="z-50 max-h-80 overflow-y-scroll rounded-xl bg-[var(--nav-locale-background,hsl(var(--background)))] p-2 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 @4xl:w-32 @4xl:rounded-2xl @4xl:p-2"
            sideOffset={16}
          >
            {currencies.map((currency) => (
              <DropdownMenu.Item
                className={clsx(
                  'font-[family-name:var(--nav-locale-link-font-family,var,--font-family-body))] hover:text-[var(--nav-locale-link-text-hover,hsl(var,--foreground)))] cursor-default rounded-lg bg-[var(--nav-locale-link-background,transparent)] px-2.5 py-2 text-sm font-medium text-[var(--nav-locale-link-text,hsl(var(--contrast-400)))] outline-none ring-[var(--nav-focus,hsl(var(--primary)))] transition-colors hover:bg-[var(--nav-locale-link-background-hover,hsl(var(--contrast-100)))]',
                  {
                    'text-[var(--nav-locale-link-text-selected,hsl(var(--foreground)))]':
                      currency.id === activeCurrencyId,
                  },
                )}
                key={currency.id}
                onSelect={() => {
                  // eslint-disable-next-line @typescript-eslint/require-await
                  startTransition(async () => {
                    const formData = new FormData();

                    formData.append('id', currency.id);
                    formAction(formData);
                    // This is needed to refresh the Data Cache after the product has been added to the cart.
                    // The cart id is not picked up after the first time the cart is created/updated.
                    router.refresh();
                  });
                }}
              >
                {currency.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
