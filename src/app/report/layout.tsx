import ReportHeader from "@/components/report/ReportHeader";

export default async function ReportLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-background relative flex-col">
            <ReportHeader />
            <main className="flex flex-1 overflow-hidden">{children}</main>
        </div>
    );
}
