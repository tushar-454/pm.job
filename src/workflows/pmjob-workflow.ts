import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import postgres from "postgres";
import { extractText, getDocumentProxy } from "unpdf";

type LlamaOutput = Ai_Cf_Meta_Llama_3_3_70B_Instruct_Fp8_Fast_Output;

type AiReport = {
    title: string;
    matchPercentage: number;
    missingKeywords: string[];
    matchedKeywords: string[];
    experienceRecommendations: string;
    formattingRecommendations: string;
};

type ReportPayload = AiReport & {
    jobLink: string;
    jobDescription: string;
    pdfLink: string;
    pdfContent: string;
};

export type ReportWorkflowParams = {
    reportId: number;
    resumeKey: string;
    resumeFilename: string;
    jobDescription: string;
    jobLink?: string;
};

export class PMJOBWorkflow extends WorkflowEntrypoint<
    Cloudflare.Env,
    ReportWorkflowParams
> {
    async run(
        event: Readonly<WorkflowEvent<ReportWorkflowParams>>,
        step: WorkflowStep,
    ) {
        const { reportId, resumeKey, resumeFilename, jobDescription, jobLink } =
            event.payload;

        if (!Number.isInteger(reportId) || !resumeKey || !jobDescription) {
            throw new NonRetryableError(
                "Workflow payload is missing required fields.",
            );
        }

        const jobDescriptionText = await step.do(
            "resolve-job-description",
            {
                retries: {
                    limit: 3,
                    delay: "5 seconds",
                    backoff: "exponential",
                },
            },
            async () => {
                if (jobLink && jobLink.trim().length > 0) {
                    return extractPageContent(jobLink);
                }

                return jobDescription;
            },
        );

        const resumeText = await step.do(
            "extract-resume-text",
            {
                retries: {
                    limit: 3,
                    delay: "5 seconds",
                    backoff: "exponential",
                },
            },
            async () => extractResumeTextFromR2(this.env, resumeKey),
        );

        const aiJson = await step.do(
            "generate-ai-report",
            {
                retries: {
                    limit: 3,
                    delay: "10 seconds",
                    backoff: "exponential",
                },
            },
            async () =>
                generateAiReport(this.env, jobDescriptionText, resumeText),
        );

        const aiReport = parseAiReport(aiJson, resumeFilename);

        const savedReportId = await step.do(
            "save-report",
            {
                retries: {
                    limit: 3,
                    delay: "5 seconds",
                    backoff: "linear",
                },
            },
            async () =>
                saveReport(this.env, reportId, {
                    ...aiReport,
                    jobLink: jobLink ?? "",
                    jobDescription: jobDescriptionText,
                    pdfLink: resumeKey,
                    pdfContent: resumeText,
                }),
        );

        return { reportId: savedReportId };
    }
}

async function extractResumeTextFromR2(env: Cloudflare.Env, resumeKey: string) {
    const object = await env.PMJOB_R2.get(resumeKey);
    if (!object) {
        throw new NonRetryableError("Resume file not found in R2.");
    }

    const buffer = await object.arrayBuffer();
    if (!buffer.byteLength) {
        throw new NonRetryableError("Resume file is empty.");
    }

    const document = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(document, { mergePages: true });
    const trimmed = text.trim();

    if (!trimmed) {
        throw new Error("Resume text extraction returned empty output.");
    }

    return trimmed;
}

async function generateAiReport(
    env: Cloudflare.Env,
    jobDescription: string,
    resumeText: string,
) {
    const prompt = buildPrompt(jobDescription, resumeText);
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
                        title: { type: "string" },
                        matchPercentage: { type: "number" },
                        missingKeywords: {
                            type: "array",
                            items: { type: "string" },
                        },
                        matchedKeywords: {
                            type: "array",
                            items: { type: "string" },
                        },
                        experienceRecommendations: { type: "string" },
                        formattingRecommendations: { type: "string" },
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

    return normalizeAiResponse(response);
}

async function saveReport(
    env: Cloudflare.Env,
    reportId: number,
    payload: ReportPayload,
) {
    const client = postgres(env.PMJOB_HYPERDRIVE.connectionString);

    try {
        const result = await client`
            update reports
            set
                title = ${payload.title},
                match_percentage = ${payload.matchPercentage},
                missing_keywords = ${payload.missingKeywords},
                matched_keywords = ${payload.matchedKeywords},
                experience_recommendations = ${payload.experienceRecommendations},
                formatting_recommendations = ${payload.formattingRecommendations},
                job_link = ${payload.jobLink},
                job_description = ${payload.jobDescription},
                pdf_link = ${payload.pdfLink},
                pdf_content = ${payload.pdfContent}
            where id = ${reportId}
            returning id
        `;

        const updatedId = result[0]?.id;
        if (!updatedId) {
            throw new Error("Report update returned no id.");
        }

        return updatedId;
    } finally {
        await client.end({ timeout: 5 });
    }
}

function normalizeAiResponse(response: LlamaOutput) {
    if (typeof response === "string") {
        return response;
    }

    if (response && typeof response === "object" && "response" in response) {
        const value = (response as { response: unknown }).response;
        if (typeof value === "string") {
            return value;
        }
        if (value && typeof value === "object") {
            return JSON.stringify(value);
        }
        throw new Error("AI response content is not serializable.");
    }

    if (response && typeof response === "object" && "request_id" in response) {
        throw new Error("AI response is async; polling is not implemented.");
    }

    throw new Error("AI response format is unsupported.");
}

function parseAiReport(json: string, fallbackTitle: string): AiReport {
    const parsed = JSON.parse(json) as Partial<AiReport>;

    return {
        title: normalizeString(parsed.title) || fallbackTitle,
        matchPercentage: normalizePercentage(parsed.matchPercentage),
        missingKeywords: normalizeStringArray(parsed.missingKeywords),
        matchedKeywords: normalizeStringArray(parsed.matchedKeywords),
        experienceRecommendations: normalizeString(
            parsed.experienceRecommendations,
        ),
        formattingRecommendations: normalizeString(
            parsed.formattingRecommendations,
        ),
    };
}

function normalizeString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

function normalizePercentage(value: unknown) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return 0;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
}

function buildPrompt(jobDescription: string, resumeText: string) {
    return `You are an expert ATS resume reviewer. Analyze the resume against the job description and return a structured report.

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
- "matchedKeywords" should list skills that appear in both the JD and the resume if they are present bychance no match found keep it [] only match skill add strict check.
- "experienceRecommendations" should be a clear paragraph with 2-4 actionable items. Write it as advice.
- "formattingRecommendations" should be a clear paragraph focused on layout, clarity, or consistency.
- Be specific and realistic. Do not invent credentials not found in the resume.

Job Description:
${jobDescription}

Resume:
${resumeText}
`;
}

async function extractPageContent(url: string): Promise<string> {
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
