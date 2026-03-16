type JsonBodyResult<T> =
  | { data: T; response: null }
  | { data: null; response: Response };

export async function parseJsonBody<T>(
  req: Request,
  invalidResponse: Response = Response.json(
    { error: "Invalid JSON body" },
    { status: 400 }
  )
): Promise<JsonBodyResult<T>> {
  try {
    return { data: (await req.json()) as T, response: null };
  } catch {
    return { data: null, response: invalidResponse };
  }
}
