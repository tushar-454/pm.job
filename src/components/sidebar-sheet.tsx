"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    HelpCircle,
    History,
    Menu,
    MessageSquare,
    Settings,
    Zap,
} from "lucide-react";
import Link from "next/link";

type SidebarSheetProps = {
    reports: Array<{ id: number; title: string }>;
};

export function SidebarSheet({ reports }: SidebarSheetProps) {
    const hasReports = reports.length > 0;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 left-4 z-50"
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Sidebar</span>
                </Button>
            </SheetTrigger>
            <SheetContent
                side="left"
                className="w-72 p-0 flex flex-col border-r bg-muted/30"
            >
                <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
                <div className="h-14 px-4 flex items-center border-b shrink-0">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-foreground hover:opacity-80 transition"
                    >
                        <Zap className="h-5 w-5 text-primary" />
                        <span className="font-bold tracking-tight">PM.Job</span>
                    </Link>
                </div>

                <div className="p-4 flex-1 overflow-hidden flex flex-col">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                        <History className="h-3.5 w-3.5" />
                        Previous Chats
                    </h2>
                    <ScrollArea className="flex-1 -mx-2 px-2">
                        <div className="space-y-1">
                            {hasReports ? (
                                reports.map((report) => (
                                    <Link
                                        key={report.id}
                                        href={`/report/${report.id}`}
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                                    >
                                        <MessageSquare className="h-4 w-4 shrink-0" />
                                        <span className="truncate line-clamp-1">
                                            {report.title || "Untitled report"}
                                        </span>
                                    </Link>
                                ))
                            ) : (
                                <p className="px-3 py-2 text-xs text-muted-foreground">
                                    No reports yet.
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <SheetFooter>
                    <div className="p-4 border-t mt-auto shrink-0 space-y-1">
                        <Link
                            href="#"
                            className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                        >
                            <Settings className="h-4 w-4 shrink-0" />
                            Settings
                        </Link>
                        <Link
                            href="#"
                            className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                        >
                            <HelpCircle className="h-4 w-4 shrink-0" />
                            Help & Support
                        </Link>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
