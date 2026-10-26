import { adminEnabled, DISABLED_MESSAGE, passwordMatches, setAdminCookie } from "@/lib/admin";
import { clientKey, rateLimited } from "@/lib/auth";

export async function POST(req: Request) {
  if (!adminEnabled()) return Response.json({ error: DISABLED_MESSAGE }, { status: 403 });
  if (rateLimited(`admin:${clientKey(req)}`, 8)) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const body = await req.json().catch(() => null);
  if (!(await passwordMatches(String(body?.token ?? "")))) return Response.json({ error: "Wrong admin password." }, { status: 401 });
  await setAdminCookie();
  return Response.json({ ok: true });
}
