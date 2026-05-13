import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { getDB } from "@/db";
import { reports } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { AlertCircle, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ReportDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const resolvedParams = await params;
    const reportId = Number(resolvedParams.id);
    if (!Number.isInteger(reportId)) {
        notFound();
    }

    // Get authenticated user session
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const userId = session?.user?.id;
    if (!userId) {
        notFound();
    }

    const db = await getDB();
    const result = await db
        .select()
        .from(reports)
        .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));

    const report = result[0];
    if (!report) {
        notFound();
    }

    const matchPercentage = report.matchPercentage ?? 0;
    const missingKeywords = report.missingKeywords ?? [];
    const matchedKeywords = report.matchedKeywords ?? [];
    const experienceRecommendations =
        report.experienceRecommendations ?? "No recommendations available.";
    const formattingRecommendations =
        report.formattingRecommendations ?? "No recommendations available.";

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-4 md:p-8 pb-20">
                {/* Header Back & Info */}
                <div className="flex items-center gap-2 mb-8">
                    <Link href="/report">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="-ml-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-tight">
                            Report for {report.title}
                        </h1>
                        <span className="text-sm text-muted-foreground">
                            ID: {report.id}
                        </span>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Overall Score Card */}
                    <Card className="md:col-span-1 shadow-sm border-primary/20 bg-primary/5">
                        <CardHeader className="pb-3 text-center">
                            <CardTitle className="text-lg">
                                Overall Fit Score
                            </CardTitle>
                            <CardDescription>
                                Based on AI analysis
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-1 items-center justify-center">
                            <div className="relative h-32 w-32 flex items-center justify-center rounded-full border-[6px] border-primary mb-4 p-4">
                                <span className="text-4xl font-extrabold text-primary">
                                    {matchPercentage}%
                                </span>
                            </div>
                            <p className="text-sm text-center text-muted-foreground">
                                High probability of interview if you address the
                                missing keywords.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Keywords Card */}
                    <Card className="md:col-span-2 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-amber-500" />
                                Keyword Analysis
                            </CardTitle>
                            <CardDescription>
                                How well your resume terms align with the JD.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <XCircle className="h-4 w-4 text-destructive" />{" "}
                                        Missing Keywords
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {missingKeywords.length > 0 ? (
                                            missingKeywords.map((keyword) => (
                                                <Badge
                                                    key={keyword}
                                                    variant="destructive"
                                                >
                                                    {keyword}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                No missing keywords detected.
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        We recommend adding these to your
                                        &quot;Skills&quot; section or mentioning
                                        past experience specifically with these
                                        technologies.
                                    </p>
                                </div>
                                <div className="border-t pt-4">
                                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />{" "}
                                        Matched Keywords
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {matchedKeywords.length > 0 ? (
                                            matchedKeywords.map((keyword) => (
                                                <Badge
                                                    key={keyword}
                                                    variant="outline"
                                                    className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-none"
                                                >
                                                    {keyword}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                No matched keywords detected.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section Improvements */}
                    <div className="md:col-span-3 grid gap-6 md:grid-cols-2 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    Experience & Projects
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="p-4 rounded-lg bg-muted">
                                    <p className="text-muted-foreground">
                                        {experienceRecommendations}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    Formatting & Tone
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="p-4 rounded-lg bg-muted">
                                    <p className="text-muted-foreground">
                                        {formattingRecommendations}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
