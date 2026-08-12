import { useEffect, useState } from "react";
import { api, ApiError, type AuditLogRow, type LogsResponse } from "../api/client";
import { Skeleton } from "../components/Skeleton";
import { AccordionItem, AccordionField } from "../components/Accordion";
import { Pager } from "../components/Pager";

const PAGE_SIZE = 50;

// SCREAMING_SNAKE_CASE action codes -> "Title Case" for a readable label,
// e.g. "PASSWORD_UPDATED" -> "Password Updated". Exact code is still
// available via the element's title attribute for anyone who needs it.
function formatAction(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Best-effort, dependency-free summary of a raw user-agent string — good
// enough for a log line, not meant to be a full UA parser.
function summarizeUserAgent(ua: string | null): string | null {
  if (!ua) return null;

  let os = "Unknown OS";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Linux/.test(ua)) os = "Linux";

  let browser = "Unknown browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";

  return `${browser} on ${os}`;
}

export function Logs() {
  const [logsResponse, setLogsResponse] = useState<LogsResponse | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    setError(null);
    setExpandedLogs(new Set());
    api
      .getLogs(PAGE_SIZE, offset)
      .then(setLogsResponse)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load logs"))
      .finally(() => setLoading(false));
  }, [offset]);

  function toggleLog(id: number) {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="page-title">Logs</h1>
        <p className="meta-text">Audit trail of account and data actions, most recent first.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <section className="card">
          <div className="toolbar-row" style={{ marginBottom: 12 }}>
            <Skeleton width="30%" height={20} />
            <Skeleton width={140} height={32} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={44} />
            ))}
          </div>
        </section>
      )}

      {!loading && logsResponse && (
        <section className="card">
          <div className="toolbar-row" style={{ marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>
              Activity ({logsResponse.total})
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span className="meta-text">
                {logsResponse.total === 0
                  ? 0
                  : `${offset + 1}–${Math.min(offset + PAGE_SIZE, logsResponse.total)} of ${logsResponse.total}`}
              </span>
              <Pager offset={offset} limit={PAGE_SIZE} total={logsResponse.total} onOffsetChange={setOffset} />
            </div>
          </div>

          <div className="accordion-list">
            {logsResponse.rows.map((log) => (
              <LogEntry key={log.id} log={log} expanded={expandedLogs.has(log.id)} onToggle={() => toggleLog(log.id)} />
            ))}
            {logsResponse.rows.length === 0 && <div className="meta-text">No activity recorded.</div>}
          </div>
        </section>
      )}
    </div>
  );
}

function LogEntry({ log, expanded, onToggle }: { log: AuditLogRow; expanded: boolean; onToggle: () => void }) {
  const deviceSummary = summarizeUserAgent(log.user_agent);
  const target = log.target_type ? `${log.target_type}${log.target_id !== null ? ` #${log.target_id}` : ""}` : "—";

  return (
    <AccordionItem
      expanded={expanded}
      onToggle={onToggle}
      label={
        <span className="log-entry-summary">
          <span className="log-entry-title">
            <span className="log-status-dot" style={{ background: log.success ? "var(--paid)" : "var(--error)" }} />
            <span title={log.action}>{formatAction(log.action)}</span>
            <span className="log-meta log-entry-timestamp">{formatTimestamp(log.timestamp)}</span>
          </span>
          <span className="log-meta">{log.user_id !== null ? `User #${log.user_id}` : "System"}</span>
        </span>
      }
    >
      <AccordionField label="Target" value={target} />
      <AccordionField label="IP address" value={log.ip_address ?? "—"} />
      <AccordionField label="Device" value={deviceSummary ?? "—"} />
      {!log.success && log.error_message && <AccordionField label="Error" value={<span style={{ color: "var(--error)" }}>{log.error_message}</span>} />}
      {log.notes && <AccordionField label="Notes" value={log.notes} />}
    </AccordionItem>
  );
}
