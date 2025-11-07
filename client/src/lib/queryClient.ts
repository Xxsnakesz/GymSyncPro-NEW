import { QueryClient, QueryFunction } from "@tanstack/react-query";

function buildFriendlyMessage(status: number, apiMessage?: string) {
  const defaults: Record<number, string> = {
    400: "Ada data yang belum tepat. Mohon periksa kembali dan coba lagi.",
    401: "Email/No. Telepon/Username atau password tidak cocok. Coba lagi.",
    403: "Anda tidak memiliki izin untuk melakukan aksi ini.",
    404: "Maaf, data yang Anda cari tidak ditemukan.",
    409: "Data sudah terdaftar. Coba gunakan yang lain.",
    422: "Input tidak valid. Silakan periksa form Anda.",
    429: "Terlalu banyak percobaan. Coba lagi beberapa saat.",
    500: "Terjadi kesalahan pada server. Coba lagi nanti.",
    502: "Server sedang bermasalah (Bad Gateway). Coba beberapa saat lagi.",
    503: "Layanan sementara tidak tersedia. Database belum terhubung atau sedang maintenance. Coba lagi nanti.",
    504: "Server timeout. Silakan coba lagi.",
  };

  if (status >= 500) return defaults[status] || defaults[500];

  // If API provides a clean human message, prefer it; otherwise use our friendly default.
  const trimmed = (apiMessage || "").trim();
  if (trimmed && !trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return trimmed;
  }
  return defaults[status] || "Terjadi kesalahan. Silakan coba lagi.";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let apiMessage: string | undefined;
    let fieldErrors: string[] | undefined;
    try {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        apiMessage = (data && (data.message || data.error || data.detail)) as string | undefined;
        const errs = (data && (data.errors || data.issues)) as any[] | undefined;
        if (Array.isArray(errs)) {
          fieldErrors = errs
            .map((e) => e?.message)
            .filter(Boolean)
            .slice(0, 2) as string[];
        }
      } else {
        apiMessage = await res.text();
      }
    } catch {
      apiMessage = res.statusText || undefined;
    }

  const friendlyBase = buildFriendlyMessage(res.status, apiMessage);
    const friendly = fieldErrors && fieldErrors.length > 0
      ? `${friendlyBase} ${fieldErrors.join(". ")}`
      : friendlyBase;
    const err: any = new Error(friendly);
    err.status = res.status;
    err.rawMessage = apiMessage;
    if (fieldErrors) err.fieldErrors = fieldErrors;
    err.friendly = true;
    throw err;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
  } catch (e) {
    const err: any = new Error("Tidak bisa terhubung ke server. Periksa koneksi internet Anda dan coba lagi.");
    err.cause = e;
    throw err;
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let res: Response;
    try {
      res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });
    } catch (e) {
      const err: any = new Error("Tidak bisa memuat data. Periksa koneksi internet Anda dan coba lagi.");
      err.cause = e;
      throw err;
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      // Try to read text to aid debugging, but throw a friendly error
      let snippet = "";
      try {
        const txt = await res.text();
        snippet = txt?.slice(0, 60) || "";
      } catch {}
      const err: any = new Error(
        snippet
          ? `Respon server bukan JSON yang valid: ${snippet}`
          : "Respon server bukan JSON yang valid"
      );
      err.status = res.status;
      throw err;
    }
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
