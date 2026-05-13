import {
    index,
    integer,
    pgTable,
    serial,
    text,
    timestamp,
    varchar,
} from "drizzle-orm/pg-core";
import { users } from "./auth-schema";

export const reports = pgTable("reports", {
    id: serial("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    matchPercentage: integer("match_percentage"),
    missingKeywords: text("missing_keywords").array(),
    matchedKeywords: text("matched_keywords").array(),
    experienceRecommendations: text("experience_recommendations"),
    formattingRecommendations: text("formatting_recommendations"),
    jobLink: text("job_link"),
    jobDescription: text("job_description"),
    pdfLink: text("pdf_link"),
    pdfContent: text("pdf_content"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const reportStatusLogs = pgTable(
    "report_status_logs",
    {
        id: serial("id").primaryKey(),
        reportId: integer("report_id")
            .notNull()
            .references(() => reports.id, { onDelete: "cascade" }),
        message: text("message").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => ({
        reportIdIdx: index("report_status_logs_report_id_idx").on(
            table.reportId,
        ),
    }),
);
