import { Router, type IRouter } from "express";
import { db, applicantsTable } from "@workspace/db";

const router: IRouter = Router();

function extractField(payload: Record<string, any>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== "") {
      return String(payload[key]);
    }
  }
  return undefined;
}

router.post("/webhook/cf7", async (req, res) => {
  try {
    const payload = req.body || {};

    if (!payload || Object.keys(payload).length === 0) {
      res.status(400).json({ message: "Empty payload" });
      return;
    }

    const name = extractField(payload, "your-name", "name", "applicant-name", "full-name", "Name", "your_name");
    if (!name) {
      res.status(400).json({ message: "Missing required field: name" });
      return;
    }

    const applicant = {
      name,
      location: extractField(payload, "location", "Location", "your-location", "store-location"),
      position: extractField(payload, "position", "Position", "position-applying", "your-position"),
      email: extractField(payload, "your-email", "email", "Email", "email-address", "your_email"),
      address: extractField(payload, "address", "street-address", "mailing-address", "Address"),
      city: extractField(payload, "city", "City"),
      state: extractField(payload, "state", "State"),
      zip: extractField(payload, "zip", "Zip", "zip-code", "postal-code"),
      phoneHome: extractField(payload, "home-phone", "home-telephone", "phone-home", "HomePhone"),
      phoneBusiness: extractField(payload, "business-phone", "business-telephone", "phone-business", "BusinessPhone"),
      phoneCell: extractField(payload, "cell-phone", "cellular-telephone", "phone-cell", "CellPhone", "phone", "your-phone"),
      dateCanStart: extractField(payload, "date-can-start", "start-date", "available-date", "DateCanStart"),
      salaryDesired: extractField(payload, "salary-desired", "salary", "desired-salary", "SalaryDesired"),
      hasHighSchoolDiploma: (() => {
        const v = extractField(payload, "high-school-diploma", "ged", "diploma", "has-diploma");
        if (v === undefined) return undefined;
        return v.toLowerCase() === "yes" || v === "1" || v.toLowerCase() === "true";
      })(),
      rawPayload: payload,
      status: "new" as const,
    };

    await db.insert(applicantsTable).values(applicant);

    req.log.info({ applicantName: name }, "New application received via webhook");

    res.json({ message: "Application received" });
  } catch (err: any) {
    req.log.error({ err }, "Webhook processing error");
    res.status(500).json({ message: "Failed to process application" });
  }
});

export default router;
