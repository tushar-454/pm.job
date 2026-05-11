import {
    integer,
    pgTable,
    serial,
    text,
    timestamp,
    varchar,
} from "drizzle-orm/pg-core";

export const reports = pgTable("reports", {
    id: serial("id").primaryKey(),
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
