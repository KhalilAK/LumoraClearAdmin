import { useEffect, useState } from "react";
import { api, ApiError, type CommitUpdate, type RepoOption } from "../api/client";
import { Skeleton } from "../components/Skeleton";

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function Updates() {
  const [repos, setRepos] = useState<RepoOption[] | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [updates, setUpdates] = useState<CommitUpdate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getRepos()
      .then((res) => {
        setRepos(res);
        setSelectedRepo(res[0]?.key ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load repo list"));
  }, []);

  useEffect(() => {
    if (!selectedRepo) return;
    setLoading(true);
    setError(null);
    api
      .getUpdates(selectedRepo)
      .then(setUpdates)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load updates"))
      .finally(() => setLoading(false));
  }, [selectedRepo]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="toolbar-row">
        <div>
          <h1 className="page-title">Updates</h1>
          <p className="meta-text">Recent commits to main.</p>
        </div>

        {repos && repos.length > 0 && (
          <div className="pill-row">
            {repos.map((repo) => (
              <button key={repo.key} className={`pill${selectedRepo === repo.key ? " active" : ""}`} onClick={() => setSelectedRepo(repo.key)}>
                {repo.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <section className="card">
          <div className="update-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="update-entry">
                <Skeleton width={36} height={36} style={{ borderRadius: 50, flexShrink: 0 }} />
                <div className="update-body">
                  <Skeleton height={14} width="70%" />
                  <Skeleton height={12} width="40%" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && updates && (
        <section className="card">
          <div className="update-list">
            {updates.map((commit) => (
              <UpdateEntry key={commit.sha} commit={commit} />
            ))}
            {updates.length === 0 && <div className="meta-text">No commits found.</div>}
          </div>
        </section>
      )}
    </div>
  );
}

function UpdateEntry({ commit }: { commit: CommitUpdate }) {
  const [firstLine, ...rest] = commit.message.split("\n");
  const restText = rest.join("\n").trim();

  return (
    <div className="update-entry">
      {commit.avatar ? <img src={commit.avatar} alt="" className="update-avatar" /> : <div className="update-avatar update-avatar-placeholder" aria-hidden="true" />}

      <div className="update-body">
        <div className="update-header">
          <span className="update-message">{firstLine}</span>
          <a href={commit.url} target="_blank" rel="noreferrer" className="update-sha">
            {commit.shortSha}
          </a>
        </div>
        {restText && <div className="meta-text update-detail">{restText}</div>}
        <div className="log-meta">
          {commit.username !== "Unknown" ? `@${commit.username}` : commit.author} • {formatDate(commit.date)}
        </div>
      </div>
    </div>
  );
}
