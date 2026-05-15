import ChatInputArea from "@/components/report/ChatInputArea";
import SidebarWrapper from "@/components/report/SidebarWrapper";
import { Button } from "@/components/ui/button";
import { Bot, Menu, Plus } from "lucide-react";
import { Suspense } from "react";

export default function ReportPage() {
    return (
        <div className="flex-1 h-full relative flex flex-col min-w-0">
            <Suspense
                fallback={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 left-4 z-50 animate-pulse"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle Sidebar</span>
                    </Button>
                }
            >
                <SidebarWrapper />
            </Suspense>
            <div className="flex flex-col h-full items-center justify-center relative">
                <div className="w-full max-w-3xl flex-1 flex flex-col p-4 md:p-8">
                    {/* Empty State / Welcome */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-10">
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <Bot className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-semibold mb-3">
                            What job are you targeting?
                        </h2>
                        <p className="text-muted-foreground">
                            Upload your resume (PDF/Image) using the{" "}
                            <Plus className="inline h-4 w-4 align-text-bottom mx-1" />{" "}
                            icon below, then paste the job description or a link
                            to the job posting. PM.Job will analyze your fit and
                            guide you to improve your resume.
                        </p>
                    </div>

                    {/* Input Area */}
                    <ChatInputArea />
                </div>
            </div>
        </div>
    );
}
