import worker from "../.open-next/worker.js";
import { queue } from "./queue/report.js";

export {
    BucketCachePurge,
    DOQueueHandler,
    DOShardedTagCache,
} from "../.open-next/worker.js";
const workerWithQueue = {
    ...worker,
    queue,
};

export default workerWithQueue;
