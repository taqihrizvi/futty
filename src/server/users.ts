import { hashPassword } from "@/server/password";
import { getPool } from "./db";

export type Account = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
};

export async function findUserByEmail(email: string): Promise<Account | null> {
  const result = await getPool().query<{
    id: string;
    email: string;
    name: string;
    password_hash: string;
  }>("SELECT id, email, name, password_hash FROM users WHERE email = $1", [email]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
  };
}

export async function seedOrganizer() {
  const existing = await getPool().query("SELECT 1 FROM users LIMIT 1");
  if ((existing.rowCount ?? 0) > 0) return;
  const password = process.env.APP_PASSWORD;
  if (!password) return;
  const email = (process.env.APP_EMAIL || "alex.rivera@futty.app").trim().toLowerCase();
  await getPool().query(
    `INSERT INTO users (id, email, name, password_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    ["user_organizer", email, "Alex Rivera", await hashPassword(password)],
  );
}
