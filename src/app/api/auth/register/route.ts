import { clientKey, createUser, findUserByEmail, rateLimited, startSession } from "@/lib/auth";

export async function POST(req: Request) {
  if (rateLimited(`register:${clientKey(req)}`, 5)) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = body?.name ? String(body.name).trim().slice(0, 80) : null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (await findUserByEmail(email)) return Response.json({ error: "An account with that email already exists." }, { status: 409 });

  const user = await createUser(email, password, name);
  await startSession(user.id);
  return Response.json({ user });
}
