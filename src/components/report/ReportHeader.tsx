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
import { authClient } from "@/lib/auth-client";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ReportHeader() {
    const { data: session, isPending, error } = authClient.useSession();
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
        } catch (err) {
            console.error("Error during logout:", err);
            toast.error("Failed to logout");
        } finally {
            setIsLoggingOut(false);
        }
    };

    const getInitials = (name: string) =>
        name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();

    const renderAuth = () => {
        if (isPending) {
            return (
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            );
        }

        if (error) {
            return (
                <Link href="/login">
                    <Button
                        size="sm"
                        variant="destructive"
                    >
                        Session Error
                    </Button>
                </Link>
            );
        }

        if (session?.user) {
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Avatar className="cursor-pointer h-10 w-10">
                            <AvatarImage
                                src={session.user.image ?? ""}
                                alt={session.user.name}
                            />
                            <AvatarFallback>
                                {getInitials(session.user.name)}
                            </AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <div className="px-2 py-1.5 text-sm font-medium">
                            {session.user.name}
                        </div>
                        <DropdownMenuItem
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="text-red-600 focus:text-red-600"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            {isLoggingOut ? "Logging out..." : "Logout"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        }

        return (
            <Link href="/login">
                <Button size="sm">Login</Button>
            </Link>
        );
    };

    return (
        <header className="border-b bg-background sticky top-0 z-10 w-full">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <span className="font-bold text-xl tracking-tight">PM.Job</span>
                {renderAuth()}
            </div>
        </header>
    );
}
