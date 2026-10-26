/**
 * Every statistic the site records, and the only extra fields each may carry.
 * Nothing here identifies a person: no names, emails, index numbers, grades or IPs.
 */
export const EVENTS = {
  pageview: [],
  check_results: ["exam", "aggregate_band", "sittings"],
  result_import: ["method"],
  share: [],
  save_programme: [],
  add_to_plan: ["kind"],
  outcome_reported: [],
  alert_signup: [],
  signup: [],
  donate_prompt_shown: [],
  donate_prompt_closed: [],
  donate_click: ["where"],
  support_click: ["channel"],
  waec_portal_open: [],
} as const satisfies Record<string, readonly string[]>;

export type EventName = keyof typeof EVENTS;
export type EventProps = Record<string, string | number>;

export const EVENT_LABELS: Record<EventName, string> = {
  pageview: "Page views",
  check_results: "Admission checks with results",
  result_import: "Result slips imported",
  share: "Results shared",
  save_programme: "Programmes saved",
  add_to_plan: "Added to plan",
  outcome_reported: "Admission outcomes reported",
  alert_signup: "Email alert sign-ups",
  signup: "Accounts created",
  donate_prompt_shown: "Donation popup shown",
  donate_prompt_closed: "Donation popup closed",
  donate_click: "Donation clicks (copy / dial)",
  support_click: "Support line clicks",
  waec_portal_open: "WAEC portal opened",
};

/** Bucket an aggregate so the exact figure is never stored. */
export function aggregateBand(aggregate: number | null): string {
  if (aggregate === null) return "unknown";
  if (aggregate <= 12) return "6-12";
  if (aggregate <= 18) return "13-18";
  if (aggregate <= 24) return "19-24";
  if (aggregate <= 36) return "25-36";
  return "37+";
}
