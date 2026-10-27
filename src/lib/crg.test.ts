import { createHash, createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { signRequest, REFERENCE } = await import("./crg");

describe("CheckResultGH request signing", () => {
  it("matches the documented signing string", () => {
    const body = JSON.stringify({ type: "WAEC", quantity: 2, reference: "INV-1001" });
    const expected = createHmac("sha256", "crs_secret")
      .update(["1760000000", "abcdef0123456789", "POST", "/v1/orders", createHash("sha256").update(body).digest("hex")].join("\n"))
      .digest("hex");
    expect(signRequest("crs_secret", "1760000000", "abcdef0123456789", "post", "/v1/orders", body)).toBe(expected);
  });

  it("hashes an empty body for GET requests", () => {
    const empty = createHash("sha256").update("").digest("hex");
    expect(empty).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    const sig = signRequest("s", "1", "n".repeat(16), "GET", "/v1/orders/INV-1001", "");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("validates references like the API", () => {
    expect(REFERENCE.test("INV-1001")).toBe(true);
    expect(REFERENCE.test("cc:2026.10_ab")).toBe(true);
    expect(REFERENCE.test("abc")).toBe(false);
    expect(REFERENCE.test("has space")).toBe(false);
  });
});
