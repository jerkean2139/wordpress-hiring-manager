/**
 * Create the initial login accounts.
 *
 * Replit's database already had these rows, so nothing in the repo created
 * them. A fresh Postgres (Railway's, or any other) starts empty, and with no
 * user row `POST /api/auth/login` can only ever return 401.
 *
 * Run it once after pushing the schema:
 *
 *   SEED_OWNER_PASSWORD=... node server/seed.mjs        (inside the image)
 *   SEED_OWNER_PASSWORD=... node artifacts/api-server/dist/seed.mjs
 *
 * Existing accounts are left untouched unless SEED_FORCE=true, so re-running
 * it is safe and never silently resets a password someone has changed.
 */
import { db, usersTable, pool } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;
const FORCE = process.env.SEED_FORCE === "true";

interface SeedAccount {
  role: "owner" | "manager";
  email: string;
  password: string | undefined;
}

const accounts: SeedAccount[] = [
  {
    role: "owner",
    email: process.env.SEED_OWNER_EMAIL || "owner@redfrontpizza.com",
    password: process.env.SEED_OWNER_PASSWORD,
  },
  {
    role: "manager",
    email: process.env.SEED_MANAGER_EMAIL || "manager@redfrontpizza.com",
    // Optional: skipped when unset, so you can seed the owner alone.
    password: process.env.SEED_MANAGER_PASSWORD,
  },
];

async function upsert(account: SeedAccount): Promise<void> {
  const { role, email, password } = account;

  if (!password) {
    if (role === "owner") {
      throw new Error(
        "SEED_OWNER_PASSWORD is required. Passwords are never hardcoded — " +
          "generate one with `openssl rand -base64 24`.",
      );
    }

    console.log(`skipped ${role} ${email} (no SEED_MANAGER_PASSWORD set)`);
    return;
  }

  if (password.length < 12) {
    throw new Error(
      `Password for ${email} is too short; use at least 12 characters.`,
    );
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!existing) {
    await db.insert(usersTable).values({ email, password: hash, role });
    console.log(`created ${role} ${email}`);
    return;
  }

  if (!FORCE) {
    console.log(`exists  ${role} ${email} (set SEED_FORCE=true to reset)`);
    return;
  }

  await db
    .update(usersTable)
    .set({ password: hash, role })
    .where(eq(usersTable.id, existing.id));
  console.log(`reset   ${role} ${email}`);
}

async function main(): Promise<void> {
  for (const account of accounts) {
    await upsert(account);
  }
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err instanceof Error ? err.message : err);
    await pool.end().catch(() => {});
    process.exit(1);
  });
