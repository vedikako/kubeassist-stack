import type {
  ApiError,
  ClusterInfo,
  ClusterStatus,
  DiagnosisResponse,
  PodSummary,
  RegisteredCluster,
} from "./types";

const BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080";

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Invalid JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const err = body as ApiError | null;
    throw new Error(err?.message || err?.code || `HTTP ${res.status}`);
  }
  return body as T;
}

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/api/health`);
  return parseJson(res);
}

export async function getCluster(): Promise<ClusterInfo> {
  const res = await fetch(`${BASE}/api/cluster`);
  return parseJson(res);
}

export async function getNamespaces(): Promise<string[]> {
  const res = await fetch(`${BASE}/api/namespaces`);
  return parseJson(res);
}

export async function getPods(namespace?: string): Promise<PodSummary[]> {
  const q = namespace ? `?namespace=${encodeURIComponent(namespace)}` : "";
  const res = await fetch(`${BASE}/api/pods${q}`);
  return parseJson(res);
}

export async function getPodDetail(ns: string, name: string): Promise<unknown> {
  const res = await fetch(
    `${BASE}/api/pods/${encodeURIComponent(ns)}/${encodeURIComponent(name)}`,
  );
  return parseJson(res);
}

export async function getPodLogs(
  ns: string,
  name: string,
  previous = false,
): Promise<{ logs: string }> {
  const q = previous ? "?previous=true" : "";
  const res = await fetch(
    `${BASE}/api/pods/${encodeURIComponent(ns)}/${encodeURIComponent(name)}/logs${q}`,
  );
  return parseJson(res);
}

export async function troubleshoot(
  ns: string,
  name: string,
  body: { question?: string; serviceName?: string },
): Promise<DiagnosisResponse> {
  const res = await fetch(
    `${BASE}/api/pods/${encodeURIComponent(ns)}/${encodeURIComponent(name)}/troubleshoot`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseJson(res);
}

export type StreamStage =
  | "collecting"
  | "detecting"
  | "retrieving"
  | "diagnosing"
  | "done"
  | string;

export function troubleshootStream(
  ns: string,
  name: string,
  onStage: (stage: StreamStage) => void,
  onDone: (diagnosis: DiagnosisResponse) => void,
  onError: (err: Error) => void,
): () => void {
  const url = `${BASE}/api/pods/${encodeURIComponent(ns)}/${encodeURIComponent(name)}/troubleshoot/stream`;
  const es = new EventSource(url);

  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data) as { stage?: string } & DiagnosisResponse;
      if (data.stage) {
        onStage(data.stage);
        return;
      }
    } catch {
      /* ignore non-json keepalive */
    }
  };

  es.addEventListener("done", (ev) => {
    try {
      const diagnosis = JSON.parse((ev as MessageEvent).data) as DiagnosisResponse;
      onDone(diagnosis);
    } catch (e) {
      onError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      es.close();
    }
  });

  es.onerror = () => {
    onError(new Error("SSE connection failed — is Go running on :8080?"));
    es.close();
  };

  return () => es.close();
}

export async function registerCluster(clusterId: string): Promise<RegisteredCluster> {
  const res = await fetch(`${BASE}/api/clusters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clusterId }),
  });
  return parseJson(res);
}

export async function listClusters(): Promise<ClusterStatus[]> {
  const res = await fetch(`${BASE}/api/clusters`);
  return parseJson(res);
}

export async function remoteStatus(
  clusterId: string,
  token: string,
): Promise<{ connected: boolean }> {
  const res = await fetch(
    `${BASE}/api/remote/${encodeURIComponent(clusterId)}/status`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return parseJson(res);
}

export async function remoteTroubleshoot(
  clusterId: string,
  token: string,
  ns: string,
  name: string,
  body: { question?: string; serviceName?: string },
): Promise<DiagnosisResponse> {
  const res = await fetch(
    `${BASE}/api/remote/${encodeURIComponent(clusterId)}/pods/${encodeURIComponent(ns)}/${encodeURIComponent(name)}/troubleshoot`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
  return parseJson(res);
}

export { BASE as apiBase };
