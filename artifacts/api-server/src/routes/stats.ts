import { Router, type IRouter } from "express";
import { db, applicantsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (req, res) => {
  try {
    const statusCounts = await db
      .select({
        status: applicantsTable.status,
        count: sql<number>`count(*)`,
      })
      .from(applicantsTable)
      .groupBy(applicantsTable.status);

    const countMap: Record<string, number> = {};
    for (const row of statusCounts) {
      countMap[row.status] = Number(row.count);
    }

    const total = Object.values(countMap).reduce((a, b) => a + b, 0);

    const recentApplicants = await db
      .select({
        id: applicantsTable.id,
        location: applicantsTable.location,
        position: applicantsTable.position,
        name: applicantsTable.name,
        email: applicantsTable.email,
        status: applicantsTable.status,
        createdAt: applicantsTable.createdAt,
        updatedAt: applicantsTable.updatedAt,
      })
      .from(applicantsTable)
      .orderBy(desc(applicantsTable.createdAt))
      .limit(5);

    res.json({
      total,
      new: countMap["new"] || 0,
      reviewed: countMap["reviewed"] || 0,
      interviewing: countMap["interviewing"] || 0,
      hired: countMap["hired"] || 0,
      rejected: countMap["rejected"] || 0,
      archived: countMap["archived"] || 0,
      recentApplicants,
    });
  } catch (err: any) {
    req.log.error({ err }, "Stats error");
    res.status(500).json({ message: "Failed to get stats" });
  }
});

export default router;
