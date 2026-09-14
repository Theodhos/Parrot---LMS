import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, type ErrorCode } from "./app-error";

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ErrorCode | "UNKNOWN_ERROR";
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function apiSuccess<T>(data: T, init?: { status?: number; meta?: Record<string, unknown> }) {
  const body: ApiSuccess<T> = { success: true, data };
  if (init?.meta) body.meta = init.meta;
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

function isPrismaKnownRequestError(error: unknown): error is { code: string; meta?: Record<string, unknown> } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: unknown }).name === "PrismaClientKnownRequestError"
  );
}

export function apiError(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message, details: error.details } },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  if (isPrismaKnownRequestError(error)) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "A record with these values already exists" } },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Record not found" } },
        { status: 404 },
      );
    }
  }

  console.error("[api:unhandled]", error);
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}
