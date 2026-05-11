import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const getDB = async () => {
    const { env } = await getCloudflareContext({ async: true });
    const client = postgres(env.PMJOB_HYPERDRIVE.connectionString);

    return drizzle(client);
};
