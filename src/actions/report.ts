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

        const aiReport = await getAIReport(jobDescriptionText, resumeText);
        const parseAIReport = JSON.parse(aiReport);

        console.log("######################################################");
        console.log("AI Report:", parseAIReport);
        console.log("######################################################");

        const db = await getDB();

        await db.insert(reports).values({
            title: parseAIReport.title || resumeFile.name,
            matchPercentage: parseAIReport.matchPercentage || 0,
            missingKeywords: parseAIReport.missingKeywords || [],
            matchedKeywords: parseAIReport.matchedKeywords || [],
            experienceRecommendations:
                parseAIReport.experienceRecommendations || "",
            formattingRecommendations:
                parseAIReport.formattingRecommendations || "",
            jobLink: jobLink,
            jobDescription: jobDescriptionText,
            pdfLink: key,
            pdfContent: resumeText,
        });

        return {
            success: true,
            message: "Report saved successfully.",
        };
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

type LlamaOutput = Ai_Cf_Meta_Llama_3_3_70B_Instruct_Fp8_Fast_Output;
type LlamaResponseObject = Extract<LlamaOutput, { response: string }>;
type LlamaAsyncResponse = Extract<LlamaOutput, { request_id?: string }>;

function isLlamaResponseObject(
    value: LlamaOutput,
): value is LlamaResponseObject {
    return typeof value === "object" && value !== null && "response" in value;
}

function isLlamaAsyncResponse(value: LlamaOutput): value is LlamaAsyncResponse {
    return (
        typeof value === "object" &&
        value !== null &&
        "request_id" in value &&
        !("response" in value)
    );
}

function ensureJsonString(value: unknown) {
    if (typeof value === "string") {
        return value;
    }

    if (value && typeof value === "object") {
        return JSON.stringify(value);
    }

    throw new Error("AI response content is not serializable.");
}

export async function getAIReport(jobDescription: string, resumeText: string) {
    const prompt = `You are an expert ATS resume reviewer. Analyze the resume against the job description and return a structured report.

Return ONLY a JSON string (no markdown, no code fences, no extra text) that matches this schema:
{
    "title": string,
    "matchPercentage": number,
    "missingKeywords": string[],
    "matchedKeywords": string[],
    "experienceRecommendations": string,
    "formattingRecommendations": string
}

Guidelines:
- Output must be a single JSON object that can be parsed with JSON.parse and accessed with dot notation.
- "title" should be a concise role name inferred from the job description.
- "matchPercentage" should be an integer from 0 to 100.
- "missingKeywords" should list skill or domain terms present in the JD but missing from the resume.
- "matchedKeywords" should list skills that appear in both.
- "experienceRecommendations" should be a clear paragraph with 2-4 actionable items. Write it as advice.
- "formattingRecommendations" should be a clear paragraph focused on layout, clarity, or consistency.
- Be specific and realistic. Do not invent credentials not found in the resume.

Job Description:
${jobDescription}

Resume:
${resumeText}
`;

    const { env } = await getCloudflareContext({ async: true });
    const response: LlamaOutput = await env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        {
            messages: [
                {
                    role: "system",
                    content:
                        "Analyze resume. Return ONLY valid JSON. No markdown.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],

            response_format: {
                type: "json_schema",
                json_schema: {
                    type: "object",
                    properties: {
                        title: {
                            type: "string",
                        },
                        matchPercentage: {
                            type: "number",
                        },
                        missingKeywords: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                        matchedKeywords: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                        experienceRecommendations: {
                            type: "string",
                        },
                        formattingRecommendations: {
                            type: "string",
                        },
                    },
                    required: [
                        "title",
                        "matchPercentage",
                        "missingKeywords",
                        "matchedKeywords",
                        "experienceRecommendations",
                        "formattingRecommendations",
                    ],
                },
            },
        },
    );

    if (typeof response === "string") {
        return ensureJsonString(response);
    }

    if (isLlamaAsyncResponse(response)) {
        throw new Error("AI response is async; polling is not implemented.");
    }

    if (isLlamaResponseObject(response)) {
        return ensureJsonString(response.response);
    }

    throw new Error("AI response format is unsupported.");
}
