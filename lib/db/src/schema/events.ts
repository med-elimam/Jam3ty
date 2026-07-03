import { pgTable, text, integer, boolean, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { universitiesTable } from "./academic";

export const eventTypeEnum = pgEnum("event_type", [
  "university", "club", "training", "competition", "workshop", "conference", "other",
]);

export const eventsTable = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  type: eventTypeEnum("event_type").notNull().default("other"),
  location: text("location"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  universityId: uuid("university_id").references(() => universitiesTable.id),
  clubId: uuid("club_id"),
  registrationCount: integer("registration_count").notNull().default(0),
  createdBy: uuid("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventRegistrationsTable = pgTable("event_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clubStatusEnum = pgEnum("club_status", ["active", "inactive"]);

export const clubsTable = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  universityId: uuid("university_id").references(() => universitiesTable.id),
  logoUrl: text("logo_url"),
  presidentId: uuid("president_id").references(() => usersTable.id),
  memberCount: integer("member_count").notNull().default(0),
  status: clubStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clubMembersTable = pgTable("club_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clubJoinRequestsTable = pgTable("club_join_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const opportunityTypeEnum = pgEnum("opportunity_type", [
  "internship", "job", "training", "scholarship", "competition", "hackathon", "freelance", "volunteering",
]);

export const opportunitiesTable = pgTable("opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  organization: text("organization").notNull(),
  type: opportunityTypeEnum("opportunity_type").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  deadline: text("deadline"),
  link: text("link"),
  targetInfo: text("target_info"),
  isFeatured: boolean("is_featured").notNull().default(false),
  status: text("status").notNull().default("active"),
  createdBy: uuid("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export const insertClubSchema = createInsertSchema(clubsTable).omit({ id: true, createdAt: true });
export const insertOpportunitySchema = createInsertSchema(opportunitiesTable).omit({ id: true, createdAt: true });

export type Event = typeof eventsTable.$inferSelect;
export type Club = typeof clubsTable.$inferSelect;
export type Opportunity = typeof opportunitiesTable.$inferSelect;
