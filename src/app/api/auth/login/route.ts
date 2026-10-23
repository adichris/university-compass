import { clientKey, findUserByEmail, rateLimited, startSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  if (rateLimited(`login:${clientKey(req)}`)) {
    return Response.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return Response.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  await startSession(user.id);
  return Response.json({ user: { id: user.id, email: user.email, name: user.name } });
}
