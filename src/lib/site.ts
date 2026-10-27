/** Brand settings - change the name here and it updates everywhere. */
export const SITE = {
  name: "UniversityCompass",
  suffix: ".gh",
  tagline: "Find your way to the right university or college in Ghana",
  domain: "universitycompass.gh",
  /** Live address, used for canonical links and the sitemap when NEXT_PUBLIC_SITE_URL isn't set for the build. */
  url: "https://university-compass.digitalquotienttechnologies.com",
};

export const SITE_TITLE = `${SITE.name}${SITE.suffix}`;

/**
 * Donations and the support line. Leave a value empty to hide that option on the site.
 */
export const SUPPORT = {
  /** Support email address, e.g. "help@example.com" */
  email: "adichriz@gmail.com",
  /** Telegram username without "@" (e.g. "universitycompass_help"), or a phone number in +233... form */
  telegram: "theprocode",
  /** Optional Telegram QR code image in /public, shown on the support page for scanning from a computer */
  telegramQr: "/telegram-qr.png",
  /** Usual reply window shown next to the contact options */
  hours: "Mon - Sat, 8am - 8pm (GMT)",
  momo: {
    /** MTN MoMo number that receives donations, e.g. "024 123 4567" */
    number: "059 978 4780",
    /** Name registered on the MoMo wallet, shown so donors can confirm before sending */
    name: "Christopher Addai",
    /** Optional MoMoPay merchant ID (pay via *170# > MoMoPay) */
    merchantId: "",
  },
};

export const hasDonations = Boolean(SUPPORT.momo.number || SUPPORT.momo.merchantId);
export const hasContact = Boolean(SUPPORT.email || SUPPORT.telegram);

/**
 * Results checker sales through CheckResultGH Partners. Customers dial the short code, enter the vendor
 * code and pay by MoMo in CheckResultGH's own USSD flow. Leave `ussd` empty to hide the section.
 */
export const CHECKERS = {
  ussd: "*714*81#",
  vendorCode: "7910",
  /** Selling prices in GH₵ - keep in sync with your CheckResultGH Partners dashboard */
  prices: { WASSCE: 29, BECE: 25 } as Record<"WASSCE" | "BECE", number>,
  /**
   * Optional exam logo image in /public (e.g. "/waec-logo.png"), shown on the WASSCE and BECE badges.
   * Empty = the site's own badge icons. A trademark note is shown with the logo.
   */
  examLogo: "/waec_logo.webp",
};

export const hasCheckerSales = Boolean(CHECKERS.ussd && CHECKERS.vendorCode);
