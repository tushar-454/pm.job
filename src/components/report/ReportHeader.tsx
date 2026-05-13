"use client";
import { signOut } from "@/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type ReportHeaderProps = {
    user?: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
    } | null;
};

export default function ReportHeader({ user }: ReportHeaderProps) {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            const result = await signOut();
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            toast.success("Logged out successfully");
            router.push("/login");
        } catch (error) {
            console.error("Error during logout:", error);
            toast.error("Failed to logout");
        } finally {
            setIsLoggingOut(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();
    };

    return (
        <header className="border-b bg-background sticky top-0 z-10 w-full">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-xl tracking-tight">
                        PM.Job
                    </span>
                </div>

                {user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Avatar className="cursor-pointer h-10 w-10">
                                <AvatarImage
                                    src={user.image || ""}
                                    alt={user.name}
                                />
                                <AvatarFallback>
                                    {getInitials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <div className="px-2 py-1.5 text-sm font-medium">
                                {user.name}
                            </div>
                            <DropdownMenuItem
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="text-red-600 focus:text-red-600"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Link href="/login">
                        <Button size="sm">Login</Button>
                    </Link>
                )}
            </div>
        </header>
    );
}
