export async function queue(batch: MessageBatch<unknown>) {
    console.log("QUEUE HIT");
    for (const msg of batch.messages) {
        console.log("QUEUE:", msg.body);
    }
}
