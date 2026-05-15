import { getDB } from "@/db";
import { reports } from "@/db/schema";
import { authFn } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { SidebarSheet } from "../sidebar-sheet";

interface ReportListItem {
    id: number;
    title: string;
    createdAt: Date | null;
}

export default async function SidebarWrapper() {
    const auth = await authFn();
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const userId = session?.user?.id;

    const reportList: ReportListItem[] = [];
    if (userId) {
        const db = await getDB();
        const dbResults = await db
            .select({
                id: reports.id,
                title: reports.title,
                createdAt: reports.createdAt,
            })
            .from(reports)
            .where(eq(reports.userId, userId))
            .orderBy(desc(reports.createdAt));
        reportList.push(...dbResults);
    }
    return <SidebarSheet reports={reportList} />;
}
