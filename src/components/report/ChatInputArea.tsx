import { FileText, LinkIcon } from "lucide-react";
import ChatInputForm from "./ChatInputForm";

export default function ChatInputArea() {
    return (
        <div className="w-full max-w-3xl mx-auto shrink-0 relative bg-background/80 backdrop-blur-sm pb-4">
            {/* form  */}
            <ChatInputForm />
            {/* footer  */}
            <div className="flex text-xs text-muted-foreground mt-3 justify-center gap-4">
                <span className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> PDF/Image limits 5MB
                </span>
                <span className="flex items-center gap-1.5">
                    <LinkIcon className="h-3 w-3" /> Supports LinkedIn, Indeed
                    links
                </span>
            </div>
        </div>
    );
}
