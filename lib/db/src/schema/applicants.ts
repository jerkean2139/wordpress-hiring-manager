import { pgTable, serial, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const applicantsTable = pgTable("applicants", {
  id: serial("id").primaryKey(),
  location: text("location"),
  position: text("position"),
  name: text("name").notNull(),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  phoneHome: text("phone_home"),
  phoneBusiness: text("phone_business"),
  phoneCell: text("phone_cell"),
  dateCanStart: text("date_can_start"),
  salaryDesired: text("salary_desired"),
  hasHighSchoolDiploma: boolean("has_high_school_diploma"),
  rawPayload: jsonb("raw_payload"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertApplicantSchema = createInsertSchema(applicantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertApplicant = z.infer<typeof insertApplicantSchema>;
export type Applicant = typeof applicantsTable.$inferSelect;
