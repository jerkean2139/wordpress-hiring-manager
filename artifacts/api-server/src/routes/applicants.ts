import { Router, type IRouter } from "express";
import {
  ListApplicantsQueryParams,
  GetApplicantParams,
  UpdateApplicantParams,
  UpdateApplicantBody,
  DeleteApplicantParams,
} from "@workspace/api-zod";
import { db, applicantsTable, notesTable } from "@workspace/db";
import { eq, ilike, and, sql, desc, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/applicants", async (req, res) => {
  try {
    const params = ListApplicantsQueryParams.parse(req.query);
    const conditions = [];

    if (params.status) {
      conditions.push(eq(applicantsTable.status, params.status));
    }
    if (params.location) {
      conditions.push(eq(applicantsTable.location, params.location));
    }
    if (params.position) {
      conditions.push(eq(applicantsTable.position, params.position));
    }
    if (params.search) {
      const search = `%${params.search}%`;
      conditions.push(
        sql`(${applicantsTable.name} ILIKE ${search} OR ${applicantsTable.email} ILIKE ${search} OR ${applicantsTable.phoneCell} ILIKE ${search})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const applicants = await db
      .select({
        id: applicantsTable.id,
        location: applicantsTable.location,
        position: applicantsTable.position,
        name: applicantsTable.name,
        email: applicantsTable.email,
        address: applicantsTable.address,
        city: applicantsTable.city,
        state: applicantsTable.state,
        zip: applicantsTable.zip,
        phoneHome: applicantsTable.phoneHome,
        phoneBusiness: applicantsTable.phoneBusiness,
        phoneCell: applicantsTable.phoneCell,
        dateCanStart: applicantsTable.dateCanStart,
        salaryDesired: applicantsTable.salaryDesired,
        hasHighSchoolDiploma: applicantsTable.hasHighSchoolDiploma,
        rawPayload: applicantsTable.rawPayload,
        status: applicantsTable.status,
        createdAt: applicantsTable.createdAt,
        updatedAt: applicantsTable.updatedAt,
        notesCount: sql<number>`(SELECT COUNT(*) FROM notes WHERE notes.applicant_id = ${applicantsTable.id})`.as("notes_count"),
      })
      .from(applicantsTable)
      .where(whereClause)
      .orderBy(desc(applicantsTable.createdAt));

    res.json(applicants);
  } catch (err: any) {
    req.log.error({ err }, "List applicants error");
    res.status(400).json({ message: err.message });
  }
});

router.get("/applicants/:id", async (req, res) => {
  try {
    const { id } = GetApplicantParams.parse({ id: Number(req.params.id) });

    const [applicant] = await db
      .select({
        id: applicantsTable.id,
        location: applicantsTable.location,
        position: applicantsTable.position,
        name: applicantsTable.name,
        email: applicantsTable.email,
        address: applicantsTable.address,
        city: applicantsTable.city,
        state: applicantsTable.state,
        zip: applicantsTable.zip,
        phoneHome: applicantsTable.phoneHome,
        phoneBusiness: applicantsTable.phoneBusiness,
        phoneCell: applicantsTable.phoneCell,
        dateCanStart: applicantsTable.dateCanStart,
        salaryDesired: applicantsTable.salaryDesired,
        hasHighSchoolDiploma: applicantsTable.hasHighSchoolDiploma,
        rawPayload: applicantsTable.rawPayload,
        status: applicantsTable.status,
        createdAt: applicantsTable.createdAt,
        updatedAt: applicantsTable.updatedAt,
        notesCount: sql<number>`(SELECT COUNT(*) FROM notes WHERE notes.applicant_id = ${applicantsTable.id})`.as("notes_count"),
      })
      .from(applicantsTable)
      .where(eq(applicantsTable.id, id))
      .limit(1);

    if (!applicant) {
      res.status(404).json({ message: "Applicant not found" });
      return;
    }

    res.json(applicant);
  } catch (err: any) {
    req.log.error({ err }, "Get applicant error");
    res.status(400).json({ message: err.message });
  }
});

router.patch("/applicants/:id", async (req, res) => {
  try {
    const { id } = UpdateApplicantParams.parse({ id: Number(req.params.id) });
    const body = UpdateApplicantBody.parse(req.body);

    const [updated] = await db
      .update(applicantsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(applicantsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ message: "Applicant not found" });
      return;
    }

    res.json({ ...updated, notesCount: 0 });
  } catch (err: any) {
    req.log.error({ err }, "Update applicant error");
    res.status(400).json({ message: err.message });
  }
});

router.delete("/applicants/:id", async (req, res) => {
  try {
    const { id } = DeleteApplicantParams.parse({ id: Number(req.params.id) });

    const [deleted] = await db
      .delete(applicantsTable)
      .where(eq(applicantsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ message: "Applicant not found" });
      return;
    }

    res.json({ message: "Applicant deleted" });
  } catch (err: any) {
    req.log.error({ err }, "Delete applicant error");
    res.status(400).json({ message: err.message });
  }
});

export default router;
