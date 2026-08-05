import { Router } from "express";
import { supabase } from "../db.js";

export const logsRouter = Router();

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

// Read-only paginated audit_logs, newest first. Separate from the generic
// /api/tables/:key/rows browser (which orders by primary key ascending) —
// a log feed wants reverse-chronological order instead.
logsRouter.get("/", async (req, res) => {
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

  const { data, error, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("timestamp", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[logs] failed to read audit_logs:", error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  res.json({ rows: data, total: count, limit, offset });
});

// Both repos are private, so an unauthenticated request 404s (GitHub hides
// private repos from callers who can't prove access, rather than returning
// 403) — this is why GITHUB_API_KEY has to actually be sent.
const REPOS = {
  lumoraClearApp: { owner: "KhalilAK", repo: "LumoraClearApp", label: "LumoraClearApp" },
  lumoraClearAdmin: { owner: "KhalilAK", repo: "LumoraClearAdmin", label: "LumoraClearAdmin" },
};

logsRouter.get("/repos", (req, res) => {
  res.json(Object.entries(REPOS).map(([key, { label }]) => ({ key, label })));
});

logsRouter.get("/updates/:repoKey", async (req, res) => {
  const target = REPOS[req.params.repoKey];
  if (!target) {
    return res.status(404).json({ error: `Unknown repo "${req.params.repoKey}"` });
  }

  if (!process.env.GITHUB_API_KEY) {
    console.warn("[logs] GITHUB_API_KEY is not set — /updates will fail.");
    return res.status(502).json({ error: "GITHUB_API_KEY is not configured on the server" });
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${target.owner}/${target.repo}/commits?sha=main`, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_API_KEY}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[logs] GitHub API failed with status ${response.status}: ${errorBody}`);
      return res.status(502).json({ error: "GitHub API request failed", detail: `${response.status} ${response.statusText}` });
    }

    const commits = await response.json();

    const updates = commits.map((commit) => ({
      sha: commit.sha,
      shortSha: commit.sha.substring(0, 7),
      message: commit.commit.message,
      author: commit.commit.author.name,
      username: commit.author ? commit.author.login : "Unknown",
      avatar: commit.author ? commit.author.avatar_url : null,
      date: commit.commit.author.date,
      url: commit.html_url,
    }));

    res.json(updates);
  } catch (err) {
    console.error("[logs] failed to fetch GitHub updates:", err.message);
    res.status(502).json({ error: "Failed to fetch GitHub updates", detail: err.message });
  }
});
