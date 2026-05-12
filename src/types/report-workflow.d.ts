type PMJobWorkflowParams = import("../workflow/report").PMJobWorkflowParams;

declare namespace Cloudflare {
    interface Env {
        PMJOB_WORKFLOW: Workflow<PMJobWorkflowParams>;
    }
}

type ReportQueueMessage = {
    id: number;
    jobLink: string;
    jobDescription: string;
    pdfLink: string;
};

type PMJobWorkflowParams = ReportQueueMessage;

type AiReport = {
    title: string;
    matchPercentage: number;
    missingKeywords: string[];
    matchedKeywords: string[];
    experienceRecommendations: string;
    formattingRecommendations: string;
};

type ParsedAiReport = Partial<AiReport> & {
    matchPercentage?: number | string;
    missingKeywords?: unknown;
    matchedKeywords?: unknown;
};
