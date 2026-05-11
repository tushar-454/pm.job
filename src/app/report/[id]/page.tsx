import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { AlertCircle, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export default async function ReportDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    // Dummy dynamic data
    const matchPercentage = 78;

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
                            Report for Senior Frontend Engineer
                        </h1>
                        <span className="text-sm text-muted-foreground">
                            ID: {id}
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
                                        <Badge variant="destructive">
                                            GraphQL
                                        </Badge>
                                        <Badge variant="destructive">
                                            Next.js App Router
                                        </Badge>
                                        <Badge variant="destructive">
                                            WebSockets
                                        </Badge>
                                        <Badge variant="destructive">
                                            CI/CD Pipelines
                                        </Badge>
                                        <Badge variant="destructive">
                                            Figma Handoff
                                        </Badge>
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
                                        <Badge
                                            variant="outline"
                                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-none"
                                        >
                                            React
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-none"
                                        >
                                            TypeScript
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-none"
                                        >
                                            Tailwind CSS
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-none"
                                        >
                                            REST APIs
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-none"
                                        >
                                            Agile
                                        </Badge>
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
                                    <p className="font-semibold mb-1">
                                        Impact Measurements are Missing
                                    </p>
                                    <p className="text-muted-foreground">
                                        Your latest role under &quot;E-Commerce
                                        App&quot; lacks metrics. Try changing
                                        &quot;Built a checkout flow&quot; to{" "}
                                        <span className="italic text-foreground">
                                            &quot;Built a checkout flow that
                                            increased conversion by 14%&quot;
                                        </span>
                                        .
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted">
                                    <p className="font-semibold mb-1">
                                        Highlight Modern State Management
                                    </p>
                                    <p className="text-muted-foreground">
                                        The job requires deep Redux Toolkit /
                                        Zustand knowledge. Make sure your
                                        &quot;Dashboard Project&quot; explicitly
                                        states which state management library
                                        was used.
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
                                    <p className="font-semibold mb-1">
                                        Summary Section
                                    </p>
                                    <p className="text-muted-foreground">
                                        Consider rewriting your summary. Instead
                                        of &quot;Hardworking developer&quot;,
                                        align it with the job: &quot;Frontend
                                        Engineer with 4+ years specializing in
                                        React and performance
                                        optimization.&quot;
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted">
                                    <p className="font-semibold mb-1">
                                        Formatting issues
                                    </p>
                                    <p className="text-muted-foreground">
                                        We detected inconsistent dates in your
                                        work history. Ensure you use MM/YYYY
                                        layout consistently across all roles.
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
