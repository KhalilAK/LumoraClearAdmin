import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type TableMeta, type TableRowsResponse } from "../api/client";

const PAGE_SIZE = 50;

export function Database() {
  const [tables, setTables] = useState<TableMeta[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [rowsResponse, setRowsResponse] = useState<TableRowsResponse | null>(null);
  const [offset, setOffset] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listTables()
      .then((res) => {
        setTables(res);
        setSelectedKey(res[0]?.key ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load tables"));
  }, []);

  useEffect(() => {
    if (!selectedKey) return;
    setOffset(0);
  }, [selectedKey]);

  useEffect(() => {
    if (!selectedKey) return;
    setLoadingRows(true);
    setError(null);
    api
      .getTableRows(selectedKey, PAGE_SIZE, offset)
      .then(setRowsResponse)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load rows"))
      .finally(() => setLoadingRows(false));
  }, [selectedKey, offset]);

  const selectedTable = useMemo(() => tables?.find((t) => t.key === selectedKey) ?? null, [tables, selectedKey]);

  const columnOrder = useMemo(() => {
    if (!selectedTable) return [];
    if (!rowsResponse?.rows.length) return selectedTable.columns.map((c) => c.name);
    // Prefer the live row's own key order (covers columns not in our static metadata).
    return Object.keys(rowsResponse.rows[0]);
  }, [selectedTable, rowsResponse]);

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <aside className="card" style={{ width: 240, flexShrink: 0, position: "sticky", top: 20 }}>
        <div className="card-title" style={{ fontSize: 15 }}>
          Tables
        </div>
        {!tables && !error && <div className="meta-text">Loading…</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tables?.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedKey(t.key)}
              className="nav-tab"
              style={{
                textAlign: "left",
                justifyContent: "flex-start",
                background: t.key === selectedKey ? "var(--baseColor)" : "transparent",
                color: t.key === selectedKey ? "var(--invertText)" : "var(--text)",
              }}
            >
              {t.displayName}
            </button>
          ))}
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 className="page-title">{selectedTable?.displayName ?? "Database"}</h1>
          {selectedTable?.description && <p className="meta-text">{selectedTable.description}</p>}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {selectedTable && (
          <section className="card">
            <div className="card-title">Schema</div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Nullable</th>
                    <th>References</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTable.columns.map((c) => (
                    <tr key={c.name}>
                      <td>
                        {c.name}
                        {c.name === selectedTable.primaryKey && (
                          <span className="meta-text" style={{ marginLeft: 6 }}>
                            PK
                          </span>
                        )}
                      </td>
                      <td>{c.type}</td>
                      <td>{c.nullable ? "yes" : "no"}</td>
                      <td>{c.fk ?? "—"}</td>
                      <td>{c.description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {selectedTable && (
          <section className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="card-title" style={{ margin: 0 }}>
                Rows{rowsResponse ? ` (${rowsResponse.total})` : ""}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="meta-text">
                  {rowsResponse ? `${rowsResponse.total === 0 ? 0 : offset + 1}–${Math.min(offset + PAGE_SIZE, rowsResponse.total)} of ${rowsResponse.total}` : ""}
                </span>
                <button className="btn-secondary" disabled={offset === 0 || loadingRows} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}>
                  Prev
                </button>
                <button
                  className="btn-secondary"
                  disabled={loadingRows || !rowsResponse || offset + PAGE_SIZE >= rowsResponse.total}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Next
                </button>
              </div>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {columnOrder.map((name) => (
                      <th key={name}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsResponse?.rows.map((row, i) => (
                    <tr key={i}>
                      {columnOrder.map((name) => (
                        <td key={name}>{formatCell(row[name])}</td>
                      ))}
                    </tr>
                  ))}
                  {rowsResponse && rowsResponse.rows.length === 0 && (
                    <tr>
                      <td colSpan={columnOrder.length} className="meta-text">
                        No rows.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function formatCell(value: unknown): string | JSX.Element {
  if (value === null || value === undefined) {
    return <span className="null-cell">null</span>;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
