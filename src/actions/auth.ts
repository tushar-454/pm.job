"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";

const signInSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signIn = async (formData: FormData) => {
    const email = formData.get("email");
    const password = formData.get("password");

    const parseResult = signInSchema.safeParse({ email, password });

    if (!parseResult.success) {
        const firstError =
            parseResult.error.issues[0]?.message || "Validation failed";
        return { success: false, error: firstError };
    }

    try {
        const result = await auth.api.signInEmail({
            body: parseResult.data,
            headers: await headers(),
        });
        return { success: true, data: result };
    } catch (error) {
        console.error("Error during sign-in:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Failed to sign in";
        return { success: false, error: errorMessage };
    }
};

export const signUp = async (formData: FormData) => {
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");

    const parseResult = signUpSchema.safeParse({ name, email, password });

    if (!parseResult.success) {
        const firstError =
            parseResult.error.issues[0]?.message || "Validation failed";
        return { success: false, error: firstError };
    }

    try {
        const result = await auth.api.signUpEmail({
            body: parseResult.data,
            headers: await headers(),
        });
        return { success: true, data: result };
    } catch (error) {
        console.error("Error during registration:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Failed to register";
        return { success: false, error: errorMessage };
    }
};

export const signOut = async () => {
    try {
        await auth.api.signOut({
            headers: await headers(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error during sign-out:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Failed to sign out";
        return { success: false, error: errorMessage };
    }
};
