/** Brand settings - change the name here and it updates everywhere. */
export const SITE = {
  name: "CampusCompass",
  suffix: ".gh",
  tagline: "Find your way to the right university in Ghana",
  domain: "campuscompass.gh",
};

export const SITE_TITLE = `${SITE.name}${SITE.suffix}`;

/**
 * Donations and the support line. Leave a value empty to hide that option on the site.
 */
export const SUPPORT = {
  /** Support email address, e.g. "help@example.com" */
  email: "adichriz@gmail.com",
  /** Telegram username without "@" (e.g. "campuscompass_help"), or a phone number in +233... form */
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
