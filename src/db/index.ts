import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const getConnectionString = async (): Promise<string> => {
    try {
        const { env } = await getCloudflareContext({ async: true });
        return env.PMJOB_HYPERDRIVE.connectionString;
    } catch {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error("DATABASE_URL not set");
        return url;
    }
};

export const getDB = async () => {
    const connectionString = await getConnectionString();
    const client = postgres(connectionString, {
        max: 1,
        idle_timeout: 30,
        connect_timeout: 20,
        prepare: false,
        fetch_types: false,
        onclose: () => {},
    });
    return drizzle(client);
};

export const db = await getDB();
