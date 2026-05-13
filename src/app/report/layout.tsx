import ReportHeader from "@/components/report/ReportHeader";
import { SidebarSheet } from "@/components/sidebar-sheet";
import { getDB } from "@/db";
import { reports } from "@/db/schema";
import { auth } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

interface ReportListItem {
    id: number;
    title: string;
    createdAt: Date | null;
}

interface User {
    id: string;
    name: string;
    email: string;
    image?: string | null;
}

export default async function ReportLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const userId = session?.user?.id;
    const db = await getDB();

    const reportList: ReportListItem[] = [];
    if (userId) {
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

    const user: User | undefined = session?.user
        ? {
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
              image: session.user.image,
          }
        : undefined;

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background relative flex-col">
            <ReportHeader user={user} />

            <div className="flex flex-1 overflow-hidden">
                <SidebarSheet reports={reportList} />

                {/* Main Content Area */}
                <main className="flex-1 h-full relative flex flex-col min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
