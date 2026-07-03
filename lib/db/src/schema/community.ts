import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { universitiesTable, facultiesTable, departmentsTable, studentGroupsTable } from "./academic";
import { coursesTable } from "./courses";

export const postVisibilityEnum = pgEnum("post_visibility", [
  "public", "same_university", "same_department", "same_course", "same_group",
]);

export const moderationStatusEnum = pgEnum("moderation_status", [
  "pending", "visible", "hidden", "removed",
]);

export const postsTable = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content").notNull(),
  authorId: uuid("author_id").notNull().references(() => usersTable.id),
  universityId: uuid("university_id").references(() => universitiesTable.id),
  facultyId: uuid("faculty_id").references(() => facultiesTable.id),
  departmentId: uuid("department_id").references(() => departmentsTable.id),
  courseId: uuid("course_id").references(() => coursesTable.id),
  groupId: uuid("group_id").references(() => studentGroupsTable.id),
  visibility: postVisibilityEnum("visibility").notNull().default("same_university"),
  moderationStatus: moderationStatusEnum("moderation_status").notNull().default("visible"),
  isPinned: boolean("is_pinned").notNull().default(false),
  reactionCount: integer("reaction_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commentsTable = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reactionsTable = pgTable("reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  reaction: text("reaction").notNull().default("like"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reportsTable = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportedBy: uuid("reported_by").notNull().references(() => usersTable.id),
  targetType: text("target_type").notNull(), // post, comment, file, user
  targetId: uuid("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, createdAt: true });

export type Post = typeof postsTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
