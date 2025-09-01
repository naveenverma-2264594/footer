
import { clsx } from 'clsx';
import { ReactNode } from 'react';
import { Stream, Streamable } from '@/vibes/soul/lib/streamable';
import * as Skeleton from '@/vibes/soul/primitives/skeleton';
import { Link } from '~/components/link';
interface Image {
  src: string;
  alt: string;
}
interface FooterLink {
  href: string;
  label: string;
}
export interface Section {
  title?: string;
  links: FooterLink[];
}
interface SocialMediaLink {
  href: string;
  icon: ReactNode;
}
interface ContactInformation {
  address?: string;
  phone?: string;
}
export interface FooterProps {
  logo: Streamable<string | Image | null>;
  sections: Streamable<Section[]>;
  copyright?: Streamable<string>;
  contactInformation?: Streamable<ContactInformation>;
  paymentIcons?: Streamable<ReactNode[]>;
  socialMediaLinks?: Streamable<SocialMediaLink[]>;
  contactTitle?: string;
  className?: string;
  logoHref?: string;
  logoLabel?: string;
  logoWidth?: number;
  logoHeight?: number;
}

export const CustomFooter = ({
  logo,
  sections: streamableSections,
  contactTitle = 'Contact Us',
  contactInformation: streamableContactInformation,
  paymentIcons: streamablePaymentIcons,
  socialMediaLinks: streamableSocialMediaLinks,
  copyright: streamableCopyright,
  className,
  logoHref = '#',
  logoLabel = 'Home',
  logoWidth = 200,
  logoHeight = 40,
}: FooterProps) => {
  return (
    <footer
      className={clsx(
        'group/footer border-b-4 border-t border-b-[var(--footer-border-bottom,hsl(var(--primary)))] border-t-[var(--footer-border-top,hsl(var(--contrast-100)))] bg-[var(--footer-background,hsl(var(--background)))] @container',
        className,
      )}
    >
      
      <div className="mx-auto max-w-screen-2xl px-4 py-6 @xl:px-6 @xl:py-10 @4xl:px-8 @4xl:py-12">
        <div className="flex flex-col justify-between gap-x-24 gap-y-12 @3xl:flex-row @3xl:gap-x-64 @3xl:items-start">
          <div className="flex flex-col gap-4 @3xl:w-1/4 @3xl:gap-6 @3xl:h-full">
            {/* Contact Information */}
            <Stream fallback={<FooterContactSkeleton />} value={streamableContactInformation}>
              {(contactInformation) => {
                if (contactInformation?.address != null || contactInformation?.phone != null) {
                  return (
                    <div className="mb-4 text-lg font-medium @lg:text-xl">
                      <h3 className="text-[var(--footer-contact-title,hsl(var(--contrast-500)))]">
                        {contactTitle}
                      </h3>
                      <div className="text-[var(--footer-contact-text,hsl(var(--foreground)))]">
                        {contactInformation.address != null &&
                          contactInformation.address !== '' && <p>{contactInformation.address}</p>}
                        {contactInformation.phone != null && contactInformation.phone !== '' && (
                          <p>{contactInformation.phone}</p>
                        )}
                      </div>
                    </div>
                  );
                }
                
                return null;
              }}
            </Stream>
            {/* Social Media Links */}
            <Stream fallback={<SocialMediaLinksSkeleton />} value={streamableSocialMediaLinks}>
              {(socialMediaLinks) => {
                if (socialMediaLinks != null) {
                  return (
                    <div className="flex items-center gap-3">
                      {socialMediaLinks.map(({ href, icon }, i) => {
                        return (
                          <Link
                            className="flex items-center justify-center rounded-lg fill-[var(--footer-social-icon,hsl(var(--contrast-400)))] p-1 ring-[var(--footer-focus,hsl(var(--primary)))] transition-colors duration-300 ease-out hover:fill-[var(--footer-social-icon-hover,hsl(var(--foreground)))] focus-visible:outline-0 focus-visible:ring-2"
                            href={href}
                            key={i}
                          >
                            {icon}
                          </Link>
                        );
                      })}
                    </div>
                  );
                }
                
                return null;
              }}
            </Stream>
          </div>
          {/* Footer Columns of Links - Redesigned for precise alignment */}
          <div className="@3xl:flex-1 @3xl:flex @3xl:items-start">
            <Stream fallback={<FooterColumnsSkeleton />} value={streamableSections}>
              {(sections) => {
                const validSections = sections.filter(section => 
                  section.title && section.links && section.links.length > 0
                );
                
                if (validSections.length > 0) {
                  return (
                    <div className="w-full flex justify-end">
                      <div className="flex gap-6 pr-4">
                        {validSections.map(({ title, links }, i) => (
                          <div className="w-44 flex-shrink-0" key={i}>
                            {title != null && (
                              <h3 className="mb-3 font-semibold text-[var(--footer-section-title,hsl(var(--foreground)))]">
                                {title}
                              </h3>
                            )}
                            <ul className="space-y-2">
                              {links.map((link, idx) => (
                                <li key={idx}>
                                  <Link
                                    className="block text-sm font-medium text-[var(--footer-link,hsl(var(--contrast-500)))] hover:text-[var(--footer-link-hover,hsl(var(--foreground)))] transition-colors duration-300"
                                    href={link.href}
                                  >
                                    {link.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                
                return null;
              }}
            </Stream>
          </div>
        </div>
        <div className="flex flex-col-reverse items-start gap-y-8 pt-16 @3xl:flex-row @3xl:items-center @3xl:pt-20">
          {/* Copyright */}
          <Stream fallback={<CopyrightSkeleton />} value={streamableCopyright}>
            {(copyright) => {
              if (copyright != null) {
                return (
                  <p className="flex-1 text-sm text-[var(--footer-copyright,hsl(var(--contrast-500)))]">
                    {copyright}
                  </p>
                );
              }
              
              return null;
            }}
          </Stream>
          {/* Payment Icons */}
          <Stream fallback={<PaymentIconsSkeleton />} value={streamablePaymentIcons}>
            {(paymentIcons) => {
              if (paymentIcons != null) {
                return <div className="flex flex-wrap gap-2">{paymentIcons}</div>;
              }
              
              return null;
            }}
          </Stream>
        </div>
      </div>
    </footer>
  );
};
function FooterContactSkeleton() {
  return (
    <Skeleton.Root
      className="mb-4 text-lg group-has-[[data-pending]]/footer:animate-pulse @lg:text-xl"
      pending
    >
      <Skeleton.Text characterCount={10} className="rounded" data-pending />
      <Skeleton.Text characterCount={15} className="rounded" data-pending />
      <Skeleton.Text characterCount={12} className="rounded" data-pending />
    </Skeleton.Root>
  );
}
function SocialMediaLinksSkeleton() {
  return (
    <Skeleton.Root className="group-has-[[data-pending]]/footer:animate-pulse" pending>
      <div className="flex items-center gap-3" data-pending>
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton.Box className="h-8 w-8 rounded-full" key={idx} />
        ))}
      </div>
    </Skeleton.Root>
  );
}
function FooterColumnsSkeleton() {
  return (
    <Skeleton.Root
      className="grid max-w-5xl grid-cols-1 gap-y-8 @container-normal group-has-[[data-pending]]/footer:animate-pulse @sm:grid-cols-2 @xl:gap-y-10 @2xl:grid-cols-3 @6xl:[grid-template-columns:_repeat(auto-fill,_minmax(220px,_1fr))]"
      pending
    >
      {Array.from({ length: 4 }).map((_, idx) => (
        <div className="pr-8" data-pending key={idx}>
          <div className="mb-3 flex items-center">
            <Skeleton.Text characterCount={10} className="rounded" />
          </div>
          <FooterColumnSkeleton />
        </div>
      ))}
    </Skeleton.Root>
  );
}
function FooterColumnSkeleton() {
  return (
    <ul>
      {Array.from({ length: 4 }).map((_, idx) => (
        <li className="py-2 text-sm" key={idx}>
          <Skeleton.Text characterCount={10} className="rounded" />
        </li>
      ))}
    </ul>
  );
}
function CopyrightSkeleton() {
  return (
    <Skeleton.Root
      className="flex-1 text-sm @container-normal group-has-[[data-pending]]/footer:animate-pulse"
      pending
    >
      <Skeleton.Text characterCount={40} className="rounded" data-pending />
    </Skeleton.Root>
  );
}
function PaymentIconsSkeleton() {
  return (
    <Skeleton.Root
      className="flex flex-wrap gap-2 @container-normal group-has-[[data-pending]]/footer:animate-pulse"
      pending
    >
      {Array.from({ length: 6 }).map((_, idx) => (
        <Skeleton.Box className="h-6 w-[2.1875rem] rounded" data-pending key={idx} />
      ))}
    </Skeleton.Root>
  );
}
