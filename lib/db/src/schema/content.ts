import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  uuid,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { coursesTable } from "./courses";
import {
  universitiesTable,
  facultiesTable,
  departmentsTable,
  levelsTable,
  studentGroupsTable,
} from "./academic";

// ─── FILES ────────────────────────────────────────────────────────────────────
export const fileTypeEnum = pgEnum("file_type", [
  "lecture", "td", "tp", "summary", "exam", "correction", "book", "other",
]);

export const fileApprovalEnum = pgEnum("file_approval_status", [
  "pending", "approved", "rejected",
]);

export const filesTable = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: fileTypeEnum("file_type").notNull().default("other"),
  mimeType: text("mime_type").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull().default(0),
  courseId: uuid("course_id").references(() => coursesTable.id),
  uploadedBy: uuid("uploaded_by").notNull().references(() => usersTable.id),
  approvalStatus: fileApprovalEnum("approval_status").notNull().default("pending"),
  downloadCount: integer("download_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  tags: text("tags").array().notNull().default([]),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fileFavoritesTable = pgTable("file_favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileId: uuid("file_id").notNull().references(() => filesTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────
export const announcementPriorityEnum = pgEnum("announcement_priority", [
  "normal", "important", "urgent",
]);

export const announcementScopeEnum = pgEnum("announcement_scope", [
  "global", "university", "faculty", "department", "level", "group", "course",
]);

export const announcementsTable = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: announcementPriorityEnum("priority").notNull().default("normal"),
  scope: announcementScopeEnum("scope").notNull().default("global"),
  universityId: uuid("university_id").references(() => universitiesTable.id),
  facultyId: uuid("faculty_id").references(() => facultiesTable.id),
  departmentId: uuid("department_id").references(() => departmentsTable.id),
  levelId: uuid("level_id").references(() => levelsTable.id),
  groupId: uuid("group_id").references(() => studentGroupsTable.id),
  courseId: uuid("course_id").references(() => coursesTable.id),
  createdBy: uuid("created_by").notNull().references(() => usersTable.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const announcementReadsTable = pgTable("announcement_reads", {
  id: uuid("id").primaryKey().defaultRandom(),
  announcementId: uuid("announcement_id").notNull().references(() => announcementsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── TIMETABLE ────────────────────────────────────────────────────────────────
export const sessionTypeEnum = pgEnum("session_type", ["lecture", "td", "tp"]);

export const timetableSessionsTable = pgTable("timetable_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => coursesTable.id),
  groupId: uuid("group_id").references(() => studentGroupsTable.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  room: text("room"),
  type: sessionTypeEnum("session_type").notNull().default("lecture"),
  recurrence: text("recurrence").notNull().default("weekly"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── ASSIGNMENTS ──────────────────────────────────────────────────────────────
export const submissionStatusEnum = pgEnum("submission_status", [
  "pending", "submitted", "late", "reviewed",
]);

export const assignmentsTable = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  courseId: uuid("course_id").notNull().references(() => coursesTable.id),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  attachmentUrl: text("attachment_url"),
  createdBy: uuid("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assignmentSubmissionsTable = pgTable("assignment_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id").notNull().references(() => assignmentsTable.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => usersTable.id),
  fileUrl: text("file_url"),
  status: submissionStatusEnum("submission_status").notNull().default("pending"),
  grade: text("grade"),
  comment: text("comment"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── EXAMS ────────────────────────────────────────────────────────────────────
export const examTypeEnum = pgEnum("exam_type", [
  "midterm", "final", "makeup", "test", "other",
]);

export const examsTable = pgTable("exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  courseId: uuid("course_id").notNull().references(() => coursesTable.id),
  date: date("date").notNull(),
  startTime: text("start_time"),
  room: text("room"),
  type: examTypeEnum("exam_type").notNull().default("other"),
  createdBy: uuid("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── TYPES ────────────────────────────────────────────────────────────────────
export const insertFileSchema = createInsertSchema(filesTable).omit({ id: true, createdAt: true });
export const insertAnnouncementSchema = createInsertSchema(announcementsTable).omit({ id: true, createdAt: true });
export const insertTimetableSessionSchema = createInsertSchema(timetableSessionsTable).omit({ id: true, createdAt: true });
export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({ id: true, createdAt: true });
export const insertExamSchema = createInsertSchema(examsTable).omit({ id: true, createdAt: true });

export type File = typeof filesTable.$inferSelect;
export type Announcement = typeof announcementsTable.$inferSelect;
export type TimetableSession = typeof timetableSessionsTable.$inferSelect;
export type Assignment = typeof assignmentsTable.$inferSelect;
export type Exam = typeof examsTable.$inferSelect;
export type AssignmentSubmission = typeof assignmentSubmissionsTable.$inferSelect;
