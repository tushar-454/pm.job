import { FileText, X } from "lucide-react";
import Image from "next/image";

export default function FilePreview({
    file,
    setFile,
    fileInputRef,
}: {
    file: File | null;
    setFile: React.Dispatch<React.SetStateAction<File | null>>;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const removeFile = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png, image/jpg, application/pdf"
                onChange={handleFileChange}
            />

            {file && (
                <div className="px-3 pt-3 pb-1">
                    <div className="relative inline-flex items-center gap-3 bg-background border rounded-xl p-2 pr-5 shadow-sm max-w-70">
                        {file.type.startsWith("image/") ? (
                            <Image
                                src={URL.createObjectURL(file)}
                                alt="Preview"
                                className="h-10 w-10 object-cover rounded-lg border bg-muted"
                                width={40}
                                height={40}
                            />
                        ) : (
                            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>
                        )}
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate">
                                {file.name}
                            </span>
                            <span className="text-xs text-muted-foreground uppercase truncate">
                                {file.size > 1024 * 1024
                                    ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                                    : `${(file.size / 1024).toFixed(1)} KB`}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={removeFile}
                            className="absolute -top-2 -right-2 h-6 w-6 bg-background hover:bg-muted border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"
                        >
                            <X className="h-3.5 w-3.5" />
                            <span className="sr-only">Remove file</span>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
