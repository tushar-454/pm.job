import type { ReportWorkflowParams } from "@/workflows/pmjob-workflow";

declare global {
    namespace Cloudflare {
        interface Env {
            PMJOB_WORKFLOW: Workflow<ReportWorkflowParams>;
        }
    }
}

export {};
