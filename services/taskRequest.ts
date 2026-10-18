/** Task IDs in production are bigint, not UUIDs. Local placeholders use a prefix. */
export function persistedTaskId(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const id = String(value);
  return /^\d+$/.test(id) ? id : null;
}

export async function taskRequest<T>(
  run: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs = 12000
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new Error("Saving took too long. Check your connection and retry.")
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      Promise.resolve().then(() => run(controller.signal)),
      timeout,
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}
