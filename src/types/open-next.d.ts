declare module "*.open-next/worker.js" {
    const worker: ExportedHandler<CloudflareEnv>;
    export default worker;
    export const BucketCachePurge: unknown;
    export const DOQueueHandler: unknown;
    export const DOShardedTagCache: unknown;
}

declare module "*.open-next/worker" {
    const worker: ExportedHandler<CloudflareEnv>;
    export default worker;
}
