import { pgTable, text, integer, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const universityStatusEnum = pgEnum("university_status", [
  "community_created",
  "verified",
  "official_partner",
]);

export const universitiesTable = pgTable("universities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  nameFr: text("name_fr"),
  city: text("city").notNull().default("Nouakchott"),
  logoUrl: text("logo_url"),
  status: universityStatusEnum("status").notNull().default("community_created"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const facultiesTable = pgTable("faculties", {
  id: uuid("id").primaryKey().defaultRandom(),
  universityId: uuid("university_id").notNull().references(() => universitiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  nameFr: text("name_fr"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const departmentsTable = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  facultyId: uuid("faculty_id").notNull().references(() => facultiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  nameFr: text("name_fr"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const levelsTable = pgTable("levels", {
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id").notNull().references(() => departmentsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  yearNumber: integer("year_number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studentGroupsTable = pgTable("student_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  levelId: uuid("level_id").notNull().references(() => levelsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUniversitySchema = createInsertSchema(universitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFacultySchema = createInsertSchema(facultiesTable).omit({ id: true, createdAt: true });
export const insertDepartmentSchema = createInsertSchema(departmentsTable).omit({ id: true, createdAt: true });
export const insertLevelSchema = createInsertSchema(levelsTable).omit({ id: true, createdAt: true });
export const insertGroupSchema = createInsertSchema(studentGroupsTable).omit({ id: true, createdAt: true });

export type University = typeof universitiesTable.$inferSelect;
export type Faculty = typeof facultiesTable.$inferSelect;
export type Department = typeof departmentsTable.$inferSelect;
export type Level = typeof levelsTable.$inferSelect;
export type StudentGroup = typeof studentGroupsTable.$inferSelect;
