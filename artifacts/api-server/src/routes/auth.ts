import { Router, type IRouter } from "express";
import { LoginBody, LoginResponse, GetMeResponse, LogoutResponse } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const parsed = LoginBody.parse(req.body);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, parsed.email))
      .limit(1);

    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(parsed.password, user.password);
    if (!valid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    (req.session as any).userId = user.id;

    const data = LoginResponse.parse({
      message: "Login successful",
      user: { id: user.id, email: user.email, role: user.role },
    });
    res.json(data);
  } catch (err: any) {
    req.log.error({ err }, "Login error");
    res.status(400).json({ message: err.message || "Login failed" });
  }
});

router.get("/auth/me", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const data = GetMeResponse.parse({ id: user.id, email: user.email, role: user.role });
  res.json(data);
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    const data = LogoutResponse.parse({ message: "Logged out" });
    res.json(data);
  });
});

export default router;
