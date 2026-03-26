import { Router, type IRouter } from "express";
import { ListNotesParams, CreateNoteParams, CreateNoteBody } from "@workspace/api-zod";
import { db, notesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/applicants/:id/notes", async (req, res) => {
  try {
    const { id } = ListNotesParams.parse({ id: Number(req.params.id) });

    const notes = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.applicantId, id))
      .orderBy(desc(notesTable.createdAt));

    res.json(notes);
  } catch (err: any) {
    req.log.error({ err }, "List notes error");
    res.status(400).json({ message: err.message });
  }
});

router.post("/applicants/:id/notes", async (req, res) => {
  try {
    const { id } = CreateNoteParams.parse({ id: Number(req.params.id) });
    const body = CreateNoteBody.parse(req.body);

    const userId = (req.session as any)?.userId;
    let authorEmail = "System";
    if (userId) {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (user) authorEmail = user.email;
    }

    const [note] = await db
      .insert(notesTable)
      .values({ applicantId: id, body: body.body, author: authorEmail })
      .returning();

    res.status(201).json(note);
  } catch (err: any) {
    req.log.error({ err }, "Create note error");
    res.status(400).json({ message: err.message });
  }
});

export default router;
