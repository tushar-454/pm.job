import { parseReportQueueMessage } from "../workflow/report";

export async function queue(batch: MessageBatch<unknown>, env: CloudflareEnv) {
    console.log("QUEUE HIT");
    const workflow = env.PMJOB_WORKFLOW as Workflow<PMJobWorkflowParams>;
    for (const msg of batch.messages) {
        const payload = parseReportQueueMessage(msg.body);
        if (!payload) {
            console.warn("Queue message missing required fields", msg.body);
            continue;
        }

        await workflow.create({ params: payload });
    }
}
