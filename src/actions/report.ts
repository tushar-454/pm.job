"use server";

import { getDB } from "@/db";
import { reportStatusLogs, reports } from "@/db/schema";
import { authFn } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, asc, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import slugify from "slugify";

export async function generateReport(formData: FormData) {
    const jobDescriptionValue = formData.get("jobDescription");
    const resumeFile = formData.get("resume");

    try {
        // Check if user is authenticated
        const auth = await authFn();
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return {
                success: false,
                error: "You must be logged in to generate a report",
            };
        }

        if (
            typeof jobDescriptionValue !== "string" ||
            jobDescriptionValue.trim().length === 0 ||
            !(resumeFile instanceof File)
        ) {
            return {
                success: false,
                error: "Job description and resume file are required",
            };
        }

        const { env } = await getCloudflareContext({ async: true });
        const jobDescription = jobDescriptionValue.trim();
        const { key } = await uploadResumeToCloudflareR2(resumeFile, env);
        const jobLink = isHttpUrl(jobDescription) ? jobDescription : "";
        const jobDescriptionText = jobLink ? "" : jobDescription;
        const db = await getDB();
        const report = await db
            .insert(reports)
            .values({
                title: resumeFile.name,
                jobLink: jobLink,
                jobDescription: jobDescriptionText,
                pdfLink: key,
                userId: session.user.id,
            })
            .returning({ id: reports.id });

        await appendReportStatusLog(db, report[0].id, "Queued for processing");

        await env.PMJOB_QUEUE.send({
            id: report[0].id,
            jobLink: jobLink,
            jobDescription: jobDescriptionText,
            pdfLink: key,
        });

        return {
            success: true,
            message: "Report Processing Started",
            id: report[0].id,
        };
    } catch (error) {
        console.error("Error generating report:", error);
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Failed to generate report";
        return {
            success: false,
            error: errorMessage,
        };
    }
}

export async function checkReportStatus(reportId: number, afterLogId = 0) {
    try {
        const db = await getDB();
        const reportResult = await db
            .select({ matchPercentage: reports.matchPercentage })
            .from(reports)
            .where(eq(reports.id, reportId));

        if (!reportResult[0]) {
            return {
                success: false,
                error: "Report not found",
            };
        }

        const statusLogs = await getStatusLogs(db, reportId, afterLogId);
        const matchPercentage = reportResult[0].matchPercentage;
        return {
            success: true,
            matchPercentage,
            statusLogs,
            isReady: matchPercentage !== null && matchPercentage !== undefined,
        };
    } catch (error) {
        console.error("Error checking report status:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to check report status",
        };
    }
}

async function appendReportStatusLog(
    db: Awaited<ReturnType<typeof getDB>>,
    reportId: number,
    message: string,
) {
    try {
        await db.insert(reportStatusLogs).values({
            reportId,
            message,
        });
    } catch (error) {
        console.warn("Failed to append report status log", error);
    }
}

async function getStatusLogs(
    db: Awaited<ReturnType<typeof getDB>>,
    reportId: number,
    afterLogId = 0,
) {
    try {
        return await db
            .select({
                id: reportStatusLogs.id,
                message: reportStatusLogs.message,
            })
            .from(reportStatusLogs)
            .where(
                and(
                    eq(reportStatusLogs.reportId, reportId),
                    gt(reportStatusLogs.id, afterLogId),
                ),
            )
            .orderBy(asc(reportStatusLogs.id));
    } catch (error) {
        console.warn("Failed to read report status logs", error);
        return [] as Array<{ id: number; message: string }>;
    }
}

async function uploadResumeToCloudflareR2(
    resumeFile: File,
    env: CloudflareEnv,
) {
    const isPdfType = resumeFile.type === "application/pdf";
    const hasPdfExt = resumeFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdfType && !hasPdfExt) {
        throw new Error("Resume must be a PDF");
    }

    if (resumeFile.size === 0) {
        throw new Error("Resume file is empty");
    }

    // Resume upload in R2 bucket.
    const baseName = resumeFile.name.replace(/\.pdf$/i, "") || "resume";
    const safeName =
        slugify(baseName, { lower: true, strict: true }) || "resume";
    const key = `${safeName}-${Date.now()}.pdf`;
    const contentType = resumeFile.type || "application/pdf";
    const safeFilename = resumeFile.name.replace(/["\\]/g, "");
    const body = await resumeFile.arrayBuffer();

    if (body.byteLength === 0) {
        throw new Error(`Buffer empty. File size: ${resumeFile.size}`);
    }

    const result = await env.PMJOB_R2.put(key, body, {
        httpMetadata: {
            contentType,
            contentDisposition: `attachment; filename="${safeFilename}"`,
        },
    });

    return result;
}

function isHttpUrl(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}
