// Admin-only user management for the stock tracker.
// Runs server-side with the service role key, which never reaches the browser.
// The caller must send their own session token; only profiles with role 'admin'
// (who have already set their own password) may use it.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const LOGIN_DOMAIN = "stock-tracker.app";
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}$/;
const ROLES = ["admin", "staff"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Who is calling?
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not signed in" }, 401);
    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData?.user) return json({ error: "Not signed in" }, 401);
    const caller = authData.user;

    const { data: me } = await admin.from("profiles").select("role, must_change_password").eq("id", caller.id).single();
    if (!me || me.role !== "admin" || me.must_change_password) return json({ error: "Admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    if (action === "list") {
      const { data: profiles, error } = await admin
        .from("profiles")
        .select("id, username, display_name, role, must_change_password, created_at")
        .order("created_at");
      if (error) throw error;
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const lastSignIn = new Map((list?.users ?? []).map((u) => [u.id, u.last_sign_in_at]));
      return json({ users: profiles.map((p) => ({ ...p, last_sign_in_at: lastSignIn.get(p.id) ?? null })) });
    }

    if (action === "create") {
      const username = String(body.username ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const role = String(body.role ?? "staff");
      const displayName = String(body.display_name ?? "").trim() || username.charAt(0).toUpperCase() + username.slice(1);
      if (!USERNAME_RE.test(username)) return json({ error: "Username: 2–31 lowercase letters, numbers, . _ or -" }, 400);
      if (password.length < 8) return json({ error: "Starting password must be at least 8 characters" }, 400);
      if (!ROLES.includes(role)) return json({ error: "Role must be admin or staff" }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email: `${username}@${LOGIN_DOMAIN}`,
        password,
        email_confirm: true,
        user_metadata: { username, display_name: displayName },
        app_metadata: { role },
      });
      if (error) {
        const msg = /already|registered|exists/i.test(error.message) ? `Username "${username}" is already taken` : error.message;
        return json({ error: msg }, 400);
      }
      return json({ ok: true, id: data.user.id });
    }

    const userId = String(body.user_id ?? "");
    if (!userId) return json({ error: "Missing user_id" }, 400);

    if (action === "reset_password") {
      const password = String(body.password ?? "");
      if (password.length < 8) return json({ error: "Temporary password must be at least 8 characters" }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      const { error: pErr } = await admin.from("profiles").update({ must_change_password: true }).eq("id", userId);
      if (pErr) throw pErr;
      return json({ ok: true });
    }

    if (action === "set_role") {
      const role = String(body.role ?? "");
      if (!ROLES.includes(role)) return json({ error: "Role must be admin or staff" }, 400);
      if (userId === caller.id) return json({ error: "You can't change your own role" }, 400);
      const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
      if (error) throw error;
      await admin.auth.admin.updateUserById(userId, { app_metadata: { role } });
      return json({ ok: true });
    }

    if (action === "delete") {
      if (userId === caller.id) return json({ error: "You can't delete yourself" }, 400);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
