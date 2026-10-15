import { useEffect, useState, type ReactNode } from "react";
import {
  apiBase,
  getHealth,
  registerCluster,
  remoteStatus,
  remoteTroubleshoot,
} from "./api";
import type { DiagnosisResponse, RegisteredCluster } from "./types";

const AGENT_SOURCE =
  "C:\\Users\\Vedika\\OneDrive\\Desktop\\projects\\KubeAssist-stack\\backend-go";

function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-0.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
    >
      {ok ? "Copied" : "Copy"}
    </button>
  );
}

function DiagnosisView({ d }: { d: DiagnosisResponse }) {
  return (
    <section className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)]/80 p-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{d.failureType}</h2>
        <span className="rounded bg-black/30 px-2 py-0.5 text-xs text-[var(--muted)]">
          confidence {(d.confidenceScore * 100).toFixed(0)}%
        </span>
        {d.mode && (
          <span className="rounded bg-black/30 px-2 py-0.5 text-xs text-[var(--accent)]">
            mode: {d.mode}
          </span>
        )}
      </div>
      <p className="text-[15px] leading-relaxed text-[var(--text)]">{d.issueSummary}</p>

      <Block title="Observed evidence">
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          {d.observedEvidence?.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </Block>

      <Block title="Probable root cause">
        <p className="text-sm leading-relaxed">{d.probableRootCause}</p>
      </Block>

      <Block title="Reasoning">
        <p className="text-sm leading-relaxed text-[var(--muted)]">{d.reasoning}</p>
      </Block>

      <Block title="Resolution steps (manual â€” never auto-applied)">
        <ol className="space-y-3">
          {(d.resolutionSteps || [])
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((s) => (
              <li key={s.order} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--text)]">
                    {s.order}. {s.description}
                  </span>
                  {s.isWriteAction && (
                    <span className="rounded bg-[var(--warn)]/20 px-1.5 text-[10px] uppercase tracking-wide text-[var(--warn)]">
                      write â€” run manually
                    </span>
                  )}
                </div>
                {s.command && (
                  <div className="mt-1 flex items-start gap-2 rounded bg-black/25 p-2 font-mono text-xs text-[var(--ok)]">
                    <code className="flex-1 break-all">{s.command}</code>
                    <CopyButton text={s.command} />
                  </div>
                )}
              </li>
            ))}
        </ol>
      </Block>

      <Block title="Verification commands">
        <ul className="space-y-2">
          {(d.verificationCommands || []).map((c) => (
            <li
              key={c}
              className="flex items-start gap-2 rounded bg-black/25 p-2 font-mono text-xs"
            >
              <code className="flex-1 break-all text-[var(--muted)]">{c}</code>
              <CopyButton text={c} />
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Rollback">
        <p className="text-sm text-[var(--muted)]">{d.rollbackGuidance}</p>
      </Block>

      <Block title="Documentation">
        <ul className="space-y-2 text-sm">
          {(d.documentationReferences || []).map((r) => (
            <li key={r.url + r.title}>
              <a
                className="text-[var(--accent)] underline-offset-2 hover:underline"
                href={r.url}
                target="_blank"
                rel="noreferrer"
              >
                {r.title}
              </a>
              {r.section && (
                <span className="text-[var(--muted)]"> â€” {r.section}</span>
              )}
            </li>
          ))}
        </ul>
      </Block>

      {(d.uncertaintyNotes?.length ?? 0) > 0 && (
        <Block title="Uncertainty">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--warn)]">
            {d.uncertaintyNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Block>
      )}
    </section>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CommandBlock({ label, command }: { label: string; command: string }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <div className="flex items-start gap-2 rounded bg-black/40 p-3 font-mono text-xs text-[var(--ok)]">
        <code className="flex-1 whitespace-pre-wrap break-all">{command}</code>
        <CopyButton text={command} />
      </div>
    </div>
  );
}

export default function App() {
  const [connError, setConnError] = useState<string | null>(null);
  const [healthy, setHealthy] = useState(false);
  const [clusterName, setClusterName] = useState("kind-kubeassist-dev");
  const [registered, setRegistered] = useState<RegisteredCluster | null>(null);
  const [connected, setConnected] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [namespace, setNamespace] = useState("kubeassist-lab");
  const [podName, setPodName] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResponse | null>(null);

  useEffect(() => {
    void getHealth()
      .then(() => {
        setHealthy(true);
        setConnError(null);
      })
      .catch((e) => {
        setHealthy(false);
        setConnError(e instanceof Error ? e.message : String(e));
      });
  }, []);

  useEffect(() => {
    if (!registered) return;
    let stop = false;
    const tick = async () => {
      try {
        const s = await remoteStatus(registered.clusterId, registered.token);
        if (!stop) setConnected(s.connected);
      } catch {
        if (!stop) setConnected(false);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 3000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [registered]);

  const downloadCommand = `cp -Recurse "${AGENT_SOURCE}" "$env:USERPROFILE\\kubeassist-agent"`;

  const runCommand = registered
    ? [
        `cd "$env:USERPROFILE\\kubeassist-agent"`,
        `$env:RELAY_URL="${registered.relayUrl}"`,
        `$env:CLUSTER_ID="${registered.clusterId}"`,
        `$env:AGENT_TOKEN="${registered.token}"`,
        `$env:KUBECONFIG="$env:USERPROFILE\\.kube\\config"`,
        `$env:KUBE_CONTEXT="kind-kubeassist-dev"`,
        `go run ./cmd/agent`,
      ].join("\n")
    : "";

  async function onRegister() {
    const id = clusterName.trim();
    if (!id) return;
    setRegisterError(null);
    setDiagnosis(null);
    try {
      const reg = await registerCluster(id);
      setRegistered(reg);
      setConnected(false);
    } catch (e) {
      setRegisterError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onDiagnose() {
    if (!registered || !namespace.trim() || !podName.trim()) return;
    setBusy(true);
    setDiagError(null);
    setDiagnosis(null);
    try {
      const d = await remoteTroubleshoot(
        registered.clusterId,
        registered.token,
        namespace.trim(),
        podName.trim(),
        { question: question.trim() || undefined },
      );
      setDiagnosis(d);
    } catch (e) {
      setDiagError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            Agent install
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">KubeAssist</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
            Copy the agent from the Go backend, run it, and it connects to your
            cluster. Diagnosis comes back through that agent.
          </p>
        </div>
        <div className="text-right text-sm">
          {connError ? (
            <p className="text-[var(--bad)]">
              Cannot reach Go API ({apiBase}): {connError}
            </p>
          ) : healthy ? (
            <p className="font-medium text-[var(--ok)]">Go API ready</p>
          ) : (
            <p className="text-[var(--muted)]">Connectingâ€¦</p>
          )}
        </div>
      </header>

      <section className="mb-6 space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)]/60 p-5">
        <h2 className="text-lg font-medium">1. Download the agent</h2>
        <p className="text-sm text-[var(--muted)]">
          Name the cluster, then copy the agent out of the Go backend directory.
          The download command is a <code>cp</code> for now.
        </p>
        <label className="block text-sm text-[var(--muted)]">
          Cluster name
          <input
            className="mt-1 w-full max-w-md rounded border border-[var(--line)] bg-black/20 px-2 py-1.5 text-sm text-[var(--text)]"
            value={clusterName}
            onChange={(e) => setClusterName(e.target.value)}
            placeholder="kind-kubeassist-dev"
          />
        </label>
        <button
          type="button"
          disabled={!healthy || !clusterName.trim()}
          onClick={() => void onRegister()}
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Get download command
        </button>
        {registerError && <p className="text-sm text-[var(--bad)]">{registerError}</p>}
        {registered && (
          <CommandBlock label="Run this to download the agent" command={downloadCommand} />
        )}
      </section>

      {registered && (
        <section className="mb-6 space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)]/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">2. Connect the agent</h2>
            <span
              className={`rounded px-2 py-0.5 text-xs ${
                connected
                  ? "bg-[var(--ok)]/20 text-[var(--ok)]"
                  : "bg-[var(--warn)]/20 text-[var(--warn)]"
              }`}
            >
              {connected ? "Agent connected" : "Waiting for the agent"}
            </span>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Run this in a new terminal after the copy finishes. The agent dials
            the relay and reads the cluster from your kubeconfig.
          </p>
          <CommandBlock label="Run the agent" command={runCommand} />
        </section>
      )}

      {registered && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--panel)]/60 p-5">
            <h2 className="text-lg font-medium">3. Ask for a diagnosis</h2>
            <p className="text-sm text-[var(--muted)]">
              The agent collects status, events, and logs from the cluster, then
              Go and the AI write the report.
            </p>
            <label className="block text-xs text-[var(--muted)]">
              Namespace
              <input
                className="mt-1 w-full rounded border border-[var(--line)] bg-black/20 px-2 py-1.5 text-sm text-[var(--text)]"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
              />
            </label>
            <label className="block text-xs text-[var(--muted)]">
              Pod name
              <input
                className="mt-1 w-full rounded border border-[var(--line)] bg-black/20 px-2 py-1.5 text-sm text-[var(--text)]"
                value={podName}
                onChange={(e) => setPodName(e.target.value)}
                placeholder="configerror-test"
              />
            </label>
            <label className="block text-xs text-[var(--muted)]">
              Question (optional)
              <textarea
                className="mt-1 w-full rounded border border-[var(--line)] bg-black/20 px-2 py-1.5 text-sm text-[var(--text)]"
                rows={2}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={busy || !connected || !podName.trim()}
              onClick={() => void onDiagnose()}
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Diagnosingâ€¦" : "Run diagnosis"}
            </button>
            {!connected && (
              <p className="text-xs text-[var(--warn)]">
                Diagnosis stays disabled until the agent is connected.
              </p>
            )}
            {diagError && <p className="text-sm text-[var(--bad)]">{diagError}</p>}
          </div>
          <div>
            {diagnosis ? (
              <DiagnosisView d={diagnosis} />
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
                The report appears here after the agent returns a snapshot.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
