"use server";

import { getDB } from "@/db";
import { reports } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import slugify from "slugify";

export async function generateReport(formData: FormData) {
    const jobDescriptionValue = formData.get("jobDescription");
    const resumeFile = formData.get("resume");

    // Check if user is authenticated
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

    try {
        const { env } = await getCloudflareContext({ async: true });
        const jobDescription = jobDescriptionValue.trim();
        const { key } = await uploadResumeToCloudflareR2(resumeFile);
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

async function uploadResumeToCloudflareR2(resumeFile: File) {
    const { env } = await getCloudflareContext({ async: true });
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
