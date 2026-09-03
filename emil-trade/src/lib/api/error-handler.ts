// ═══════════════════════════════════════════════════════════
// EMIL TRADE — RFC 7807 Problem Details API Error Handler
// Standardized error responses across all API routes
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';

/**
 * RFC 7807 Problem Details response format
 * https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: { field: string; message: string; code: string }[];
  traceId?: string;
}

const ERROR_TYPES: Record<number, string> = {
  400: 'https://raptor.gio4x.com/errors/bad-request',
  401: 'https://raptor.gio4x.com/errors/unauthorized',
  403: 'https://raptor.gio4x.com/errors/forbidden',
  404: 'https://raptor.gio4x.com/errors/not-found',
  409: 'https://raptor.gio4x.com/errors/conflict',
  422: 'https://raptor.gio4x.com/errors/validation-error',
  429: 'https://raptor.gio4x.com/errors/rate-limited',
  500: 'https://raptor.gio4x.com/errors/internal-error',
};

export function problemResponse(
  status: number,
  title: string,
  detail: string,
  extras?: Partial<ProblemDetails>,
): NextResponse<ProblemDetails> {
  const traceId = crypto.randomUUID();
  const problem: ProblemDetails = {
    type: ERROR_TYPES[status] ?? `https://raptor.gio4x.com/errors/${status}`,
    title,
    status,
    detail,
    traceId,
    ...extras,
  };

  return NextResponse.json(problem, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

export function validationError(error: ZodError): NextResponse<ProblemDetails> {
  const fieldErrors = error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return problemResponse(422, 'Validation Error', 'Request body failed validation', {
    errors: fieldErrors,
  });
}

export function unauthorized(detail: string = 'Authentication required'): NextResponse<ProblemDetails> {
  return problemResponse(401, 'Unauthorized', detail);
}

export function forbidden(detail: string = 'Insufficient permissions'): NextResponse<ProblemDetails> {
  return problemResponse(403, 'Forbidden', detail);
}

export function notFound(resource: string): NextResponse<ProblemDetails> {
  return problemResponse(404, 'Not Found', `${resource} not found`);
}

export function conflict(detail: string): NextResponse<ProblemDetails> {
  return problemResponse(409, 'Conflict', detail);
}

export function rateLimited(): NextResponse<ProblemDetails> {
  return problemResponse(429, 'Rate Limited', 'Too many requests. Please try again later.');
}

export function internalError(detail: string = 'An unexpected error occurred'): NextResponse<ProblemDetails> {
  return problemResponse(500, 'Internal Server Error', detail);
}

/**
 * Validate request body against a Zod schema.
 * Returns parsed data on success, or sends RFC 7807 error response.
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ data: T; error: null } | { data: null; error: NextResponse<ProblemDetails> }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return { data: null, error: validationError(result.error) };
    }
    return { data: result.data, error: null };
  } catch {
    return {
      data: null,
      error: problemResponse(400, 'Bad Request', 'Invalid JSON in request body'),
    };
  }
}

/**
 * Validate query parameters against a Zod schema.
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>,
): { data: T; error: null } | { data: null; error: NextResponse<ProblemDetails> } {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => { params[key] = value; });
  const result = schema.safeParse(params);
  if (!result.success) {
    return { data: null, error: validationError(result.error) };
  }
  return { data: result.data, error: null };
}

/**
 * Wrap an API handler with standardized error catching.
 */
export function withErrorHandler(
  handler: (req: Request) => Promise<NextResponse>,
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (err) {
      console.error('[API Error]', err);
      if (err instanceof ZodError) {
        return validationError(err);
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      return internalError(message);
    }
  };
}
