import { afterEach, describe, expect, it, vi } from "vitest";
import { SITE } from "./site";

async function siteUrl(env: { url?: string; nodeEnv: string }) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env.nodeEnv);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", env.url);
  return (await import("./seo")).SITE_URL;
}

afterEach(() => vi.unstubAllEnvs());

describe("SITE_URL", () => {
  it("accepts a bare domain and a trailing slash", async () => {
    expect(await siteUrl({ url: "example.com", nodeEnv: "production" })).toBe("https://example.com");
    expect(await siteUrl({ url: "https://example.com/", nodeEnv: "production" })).toBe("https://example.com");
  });

  it("never uses a missing, invalid or localhost address in production", async () => {
    for (const url of [undefined, "", "http://localhost:3000", "http://127.0.0.1", "not a url"]) {
      expect(await siteUrl({ url, nodeEnv: "production" })).toBe(SITE.url);
    }
  });

  it("keeps localhost during development", async () => {
    expect(await siteUrl({ url: "http://localhost:3000", nodeEnv: "development" })).toBe("http://localhost:3000");
    expect(await siteUrl({ url: undefined, nodeEnv: "development" })).toBe("http://localhost:3000");
  });
});
