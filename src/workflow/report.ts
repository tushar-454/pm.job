import { reportStatusLogs, reports } from "@/db/schema";
import {
    WorkflowEntrypoint,
    WorkflowEvent,
    WorkflowStep,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { extractText, getDocumentProxy } from "unpdf";

export class PMJobWorkflow extends WorkflowEntrypoint<
    CloudflareEnv,
    PMJobWorkflowParams
> {
    async run(
        event: Readonly<WorkflowEvent<PMJobWorkflowParams>>,
        step: WorkflowStep,
    ) {
        const message = parseReportQueueMessage(event.payload);
        if (!message) {
            throw new NonRetryableError("Invalid workflow payload");
        }

        await appendReportStatusLog(
            this.env,
            message.id,
            "🔎 Resolving job description...",
        );
        const jobDescription = await step.do(
            "resolve job description",
            async () => resolveJobDescription(this.env, message),
        );
        await appendReportStatusLog(
            this.env,
            message.id,
            "✅ Job description resolved.",
        );
        await appendReportStatusLog(
            this.env,
            message.id,
            "📄 Extracting resume text...",
        );
        const resumeText = await step.do("extract resume text", async () =>
            readPdfTextFromR2(this.env.PMJOB_R2, message.pdfLink),
        );
        await appendReportStatusLog(
            this.env,
            message.id,
            "✅ Resume text extracted.",
        );
        await appendReportStatusLog(
            this.env,
            message.id,
            "🤖 Generating AI report...",
        );
        const aiReport = await step.do(
            "generate ai report",
            { retries: { limit: 3, delay: "5 seconds", backoff: "linear" } },
            async () => generateAiReport(this.env, jobDescription, resumeText),
        );
        await appendReportStatusLog(
            this.env,
            message.id,
            "✅ AI analysis completed.",
        );
        await appendReportStatusLog(
            this.env,
            message.id,
            "💾 Saving report...",
        );

        await step.do("update report", async () =>
            updateReport(this.env, message.id, {
                ...aiReport,
                jobDescription,
                jobLink: message.jobLink,
                pdfContent: resumeText,
            }),
        );

        await appendReportStatusLog(this.env, message.id, "🎉 Report ready");

        return { id: message.id };
    }
}

async function resolveJobDescription(
    env: CloudflareEnv,
    message: ReportQueueMessage,
) {
    const inline = message.jobDescription?.trim();
    if (inline) {
        return inline;
    }

    const url = message.jobLink?.trim();
    if (!url) {
        return "";
    }

    try {
        return await extractPageContent(env, url);
    } catch (error) {
        console.warn("Failed to extract job page content", error);
        return "";
    }
}

async function readPdfTextFromR2(bucket: R2Bucket, key: string) {
    const object = await bucket.get(key);
    if (!object) {
        throw new Error(`Resume not found in R2: ${key}`);
    }

    const buffer = await object.arrayBuffer();
    if (buffer.byteLength === 0) {
        throw new Error(`Resume buffer empty for key: ${key}`);
    }

    const document = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(document, { mergePages: true });

    return text?.trim() ?? "";
}

async function extractPageContent(env: CloudflareEnv, url: string) {
    const extractionPrompt = `Extract only the actual job description from the given job URL.

Return plain text only (no JSON, no markdown, no bullet symbols unless they are part of the original content).

Source URL:
${url}

Rules:
- Keep only role-relevant information: title, summary, responsibilities, requirements, qualifications, skills, location/employment type, compensation if present.
- Remove all website boilerplate: navigation, footer, cookie notices, legal text, ads, related jobs, sign-in prompts, employer marketing fluff not specific to the role.
- Preserve important wording from the posting and keep section meaning accurate.
- Do not invent missing details.
- If the content does not appear to contain a job description, return an empty string.
`;

    try {
        const response = await env.AI.run(
            "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
            {
                messages: [
                    {
                        role: "system",
                        content:
                            "You extract clean job descriptions from noisy scraped text. Return plain text only.",
                    },
                    {
                        role: "user",
                        content: extractionPrompt,
                    },
                ],
                max_tokens: 1200,
            },
        );

        const aiText = extractAiResponseText(response);
        const normalized = normalizeExtractedJobDescription(aiText);
        console.log("Job Description:", normalized);
        return normalized;
    } catch (error) {
        console.warn("AI job description extraction failed", error);
        return "";
    }
}

function normalizeExtractedJobDescription(text: string) {
    return text
        .replace(/^```[a-zA-Z]*\s*/g, "")
        .replace(/\s*```$/g, "")
        .replace(/^job description\s*:\s*/i, "")
        .trim();
}

async function generateAiReport(
    env: CloudflareEnv,
    jobDescription: string,
    resumeText: string,
) {
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
- "matchedKeywords" should list skills that appear in both the JD and the resume if they are present.
- "experienceRecommendations" should be a clear paragraph with 2-4 actionable items. Write it as advice.
- "formattingRecommendations" should be a clear paragraph focused on layout, clarity, or consistency.
- Be specific and realistic. Do not invent credentials not found in the resume.

Job Description:
${jobDescription}

Resume:
${resumeText}
`;

    const response = await env.AI.run(
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
                type: "json_object",
            },
            max_tokens: 900,
        },
    );

    const rawText = extractAiResponseText(response);

    const jsonText = coerceJsonObject(rawText);
    const parsed = safeJsonParse(jsonText);
    if (!parsed) {
        throw new Error("AI response is not valid JSON");
    }

    if (!hasMeaningfulAiOutput(parsed)) {
        throw new Error("AI returned an empty report");
    }

    return normalizeAiReport(parsed);
}

function extractAiResponseText(value: unknown) {
    if (typeof value === "string") {
        return value.trim();
    }

    if (value && typeof value === "object") {
        if (
            ("error" in value && value.error) ||
            ("errors" in value && value.errors)
        ) {
            throw new Error("AI response contains an error payload");
        }

        if ("response" in value && typeof value.response === "string") {
            return value.response.trim();
        }

        return JSON.stringify(value);
    }

    throw new Error("AI response content is not serializable.");
}

function coerceJsonObject(text: string) {
    const trimmed = text.trim();
    if (trimmed.startsWith("```")) {
        const stripped = trimmed.replace(/^```\w*\n?|```$/g, "").trim();
        return coerceJsonObject(stripped);
    }

    const match = trimmed.match(/\{[\s\S]*\}/);
    return match ? match[0] : trimmed;
}

function safeJsonParse(text: string): ParsedAiReport | null {
    try {
        return JSON.parse(text) as ParsedAiReport;
    } catch (error) {
        console.warn("Failed to parse AI JSON", error);
        return null;
    }
}

function hasMeaningfulAiOutput(value: ParsedAiReport) {
    if (typeof value.title === "string" && value.title.trim().length > 0) {
        return true;
    }

    if (
        typeof value.experienceRecommendations === "string" &&
        value.experienceRecommendations.trim().length > 0
    ) {
        return true;
    }

    if (
        typeof value.formattingRecommendations === "string" &&
        value.formattingRecommendations.trim().length > 0
    ) {
        return true;
    }

    if (Array.isArray(value.missingKeywords) && value.missingKeywords.length) {
        return true;
    }

    if (Array.isArray(value.matchedKeywords) && value.matchedKeywords.length) {
        return true;
    }

    if (typeof value.matchPercentage === "number") {
        return Number.isFinite(value.matchPercentage);
    }

    return false;
}

function normalizeAiReport(value: ParsedAiReport): AiReport {
    return {
        title: typeof value.title === "string" ? value.title : "Resume",
        matchPercentage: normalizeNumber(value.matchPercentage, 0),
        missingKeywords: normalizeStringArray(value.missingKeywords),
        matchedKeywords: normalizeStringArray(value.matchedKeywords),
        experienceRecommendations:
            typeof value.experienceRecommendations === "string"
                ? value.experienceRecommendations
                : "",
        formattingRecommendations:
            typeof value.formattingRecommendations === "string"
                ? value.formattingRecommendations
                : "",
    };
}

function normalizeNumber(value: unknown, fallback: number) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.round(value);
    }

    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return Math.round(parsed);
        }
    }

    return fallback;
}

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

export function parseReportQueueMessage(
    body: unknown,
): ReportQueueMessage | null {
    if (!body || typeof body !== "object") {
        return null;
    }

    const value = body as Partial<ReportQueueMessage>;
    if (typeof value.id !== "number" || !Number.isFinite(value.id)) {
        return null;
    }

    if (typeof value.pdfLink !== "string" || value.pdfLink.length === 0) {
        return null;
    }

    return {
        id: value.id,
        jobLink: typeof value.jobLink === "string" ? value.jobLink : "",
        jobDescription:
            typeof value.jobDescription === "string"
                ? value.jobDescription
                : "",
        pdfLink: value.pdfLink,
    };
}

async function updateReport(
    env: CloudflareEnv,
    id: number,
    payload: AiReport & {
        jobDescription: string;
        jobLink: string;
        pdfContent: string;
    },
) {
    const client = postgres(env.PMJOB_HYPERDRIVE.connectionString);
    try {
        const db = drizzle(client);
        await db
            .update(reports)
            .set({
                title: payload.title,
                matchPercentage: payload.matchPercentage,
                missingKeywords: payload.missingKeywords,
                matchedKeywords: payload.matchedKeywords,
                experienceRecommendations: payload.experienceRecommendations,
                formattingRecommendations: payload.formattingRecommendations,
                jobLink: payload.jobLink,
                jobDescription: payload.jobDescription,
                pdfContent: payload.pdfContent,
            })
            .where(eq(reports.id, id));
    } finally {
        await client.end({ timeout: 5 });
    }
}

async function appendReportStatusLog(
    env: CloudflareEnv,
    id: number,
    status: string,
) {
    try {
        const client = postgres(env.PMJOB_HYPERDRIVE.connectionString);
        try {
            const db = drizzle(client);
            await db.insert(reportStatusLogs).values({
                reportId: id,
                message: status,
            });
        } finally {
            await client.end({ timeout: 5 });
        }
    } catch (error) {
        console.warn("Failed to append report status log", error);
    }
}
