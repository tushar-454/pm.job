"use client";

import { generateReport } from "@/actions/report";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import FilePreview from "./FilePreview";

export default function ChatInputForm() {
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() && !file) return;

        const formData = new FormData();
        formData.append("jobDescription", input);
        if (file) {
            formData.append("resume", file);
        }

        setIsLoading(true);
        try {
            const res = await generateReport(formData);
            if (res.success) {
                toast.success(res.message);
                setInput("");
                setFile(null);
                router.push(`/report/${res.id}`);
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            console.error("Error generating report:", error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("An unknown error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="relative flex flex-col gap-1 bg-muted p-2 rounded-3xl border shadow-sm focus-within:ring-1 focus-within:ring-primary/50 transition-all"
        >
            <FilePreview
                file={file}
                setFile={setFile}
                fileInputRef={fileInputRef}
            />

            <div className="flex items-end gap-2 w-full">
                {/* file upload button  */}
                <div className="flex gap-1 shrink-0 mb-1 lg:mb-1.5 ml-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground"
                    >
                        <Plus className="h-5 w-5" />
                        <span className="sr-only">Upload Resume</span>
                    </Button>
                </div>
                {/* main textarea input  */}
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Paste job description or link..."
                    className="min-h-13 max-h-48 resize-none bg-transparent border-0 focus-visible:ring-0 shadow-none px-2 py-3.5 text-base flex-1"
                    rows={1}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                />
                {/* send button  */}
                <div className="shrink-0 mb-1 lg:mb-1.5 mr-1">
                    <Button
                        type="submit"
                        disabled={(!input.trim() && !file) || isLoading}
                        size="icon"
                        className="h-9 w-9 rounded-xl transition-all"
                    >
                        <ArrowUp className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </div>
            </div>
        </form>
    );
}
