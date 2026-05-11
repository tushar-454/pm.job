"use server";

import { getDB } from "@/db";
import { reports } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import slugify from "slugify";
import { extractText, getDocumentProxy } from "unpdf";

export async function generateReport(formData: FormData) {
    const jobDescriptionValue = formData.get("jobDescription");
    const resumeFile = formData.get("resume");

    if (
        typeof jobDescriptionValue !== "string" ||
        jobDescriptionValue.trim().length === 0 ||
        !(resumeFile instanceof File)
    ) {
        throw new Error("Job description and resume file are required");
    }

    try {
        const jobDescription = jobDescriptionValue.trim();
        const { key } = await uploadResumeToCloudflareR2(resumeFile);
        const resumeText = await parseResumePdf(resumeFile);
        const jobLink = isHttpUrl(jobDescription) ? jobDescription : "";
        const jobDescriptionText = isHttpUrl(jobDescription)
            ? await extractPageContent(jobDescription)
            : jobDescription;

        const db = await getDB();

        await db.insert(reports).values({
            title: resumeFile.name,
            matchPercentage: 85,
            missingKeywords: ["keyword1", "keyword2"],
            matchedKeywords: ["keyword3", "keyword4"],
            experienceRecommendations:
                "Consider adding more details about your experience.",
            formattingRecommendations:
                "Improve the formatting of your resume for better readability.",
            jobLink: jobLink,
            jobDescription: jobDescriptionText,
            pdfLink: key,
            pdfContent: resumeText,
        });

        return {
            success: true,
            message: "Report saved successfully.",
        };

        // use worker ai to generate the report and store the report in the database
        // return the report to the user
    } catch (error) {
        console.error("Error generating report:", error);
        throw new Error("Failed to generate report");
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

async function parseResumePdf(resumeFile: File) {
    const buffer = await resumeFile.arrayBuffer();
    const document = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(document, { mergePages: true });
    return text;
}

function isHttpUrl(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export async function extractPageContent(url: string): Promise<string> {
    const res = await fetch(url, {
        headers: {
            "user-agent": "Mozilla/5.0 (compatible; CloudflareWorker/1.0)",
        },
    });

    if (!res.ok) {
        throw new Error(`Fetch failed: ${res.status}`);
    }

    const html = await res.text();

    const content = html
        // remove scripts
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        // remove styles
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        // remove noscript
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
        // remove svg
        .replace(/<svg[\s\S]*?<\/svg>/gi, "")
        // convert breaks
        .replace(/<\/(p|div|section|article|h1|h2|h3|li)>/gi, "\n")
        // strip tags
        .replace(/<[^>]+>/g, " ")
        // decode basic entities
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        // cleanup
        .replace(/\s+\n/g, "\n")
        .replace(/\n\s+/g, "\n")
        .replace(/\n{2,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();

    return content;
}
