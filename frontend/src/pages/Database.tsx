import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, type TableMeta, type TableRowsResponse } from "../api/client";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { Skeleton } from "../components/Skeleton";

const PAGE_SIZE = 50;

export function Database() {
  const [tables, setTables] = useState<TableMeta[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [rowsResponse, setRowsResponse] = useState<TableRowsResponse | null>(null);
  const [offset, setOffset] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Accordion expand state — which schema columns / row indices (on the
  // current page) are expanded. Table/page switches start collapsed.
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  // Whether the Schema/Rows section cards themselves are expanded — both
  // start closed.
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [rowsOpen, setRowsOpen] = useState(false);

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
    setExpandedColumns(new Set());
    // Otherwise the previous table's row count/rows stay on screen — behind
    // the loading skeleton once it kicks in, but visible in the interim.
    setRowsResponse(null);
  }, [selectedKey]);

  useEffect(() => {
    setExpandedRows(new Set());
  }, [selectedKey, offset]);

  function toggleColumn(name: string) {
    setExpandedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleRow(index: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

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
    <div className="db-layout">
      <aside className="card db-sidebar">
        <div className="card-title" style={{ fontSize: 15 }}>
          Tables
        </div>
        {!tables && !error && (
          <Skeleton height={200}>
            <LoadingIndicator size="sm" />
          </Skeleton>
        )}
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

      <div className="db-sidebar-mobile">
        <label className="field-label" htmlFor="table-select">
          Table
        </label>
        <select id="table-select" className="text-input" value={selectedKey ?? ""} onChange={(e) => setSelectedKey(e.target.value)}>
          {tables?.map((t) => (
            <option key={t.key} value={t.key}>
              {t.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="db-content">
        <div>
          <h1 className="page-title">{selectedTable?.displayName ?? "Database"}</h1>
          {selectedTable?.description && <p className="meta-text">{selectedTable.description}</p>}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {!tables && !error && (
          <section className="card">
            <Skeleton height={220}>
              <LoadingIndicator size="sm" />
            </Skeleton>
          </section>
        )}

        {selectedTable && (
          <section className="card">
            <button className="section-toggle" onClick={() => setSchemaOpen((o) => !o)}>
              <span className="card-title" style={{ margin: 0 }}>
                Schema
              </span>
              <span className="accordion-chevron">{schemaOpen ? "▾" : "▸"}</span>
            </button>

            {schemaOpen && (
              <div className="accordion-list" style={{ marginTop: 12 }}>
                {selectedTable.columns.map((c) => (
                  <AccordionItem
                    key={c.name}
                    expanded={expandedColumns.has(c.name)}
                    onToggle={() => toggleColumn(c.name)}
                    label={
                      <>
                        {c.name}
                        {c.name === selectedTable.primaryKey && (
                          <span className="meta-text" style={{ marginLeft: 6 }}>
                            PK
                          </span>
                        )}
                      </>
                    }
                  >
                    <AccordionField label="Type" value={c.type} />
                    <AccordionField label="Nullable" value={c.nullable ? "yes" : "no"} />
                    <AccordionField label="References" value={c.fk ?? "—"} />
                    <AccordionField label="Notes" value={c.description ?? "—"} />
                  </AccordionItem>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedTable && (
          <section className="card">
            <div className="toolbar-row">
              <button className="section-toggle" onClick={() => setRowsOpen((o) => !o)}>
                <span className="card-title" style={{ margin: 0 }}>
                  Rows{rowsResponse ? ` (${rowsResponse.total})` : ""}
                </span>
                <span className="accordion-chevron">{rowsOpen ? "▾" : "▸"}</span>
              </button>

              {rowsOpen && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
              )}
            </div>

            {rowsOpen && loadingRows && (
              <Skeleton height={160} style={{ marginTop: 12 }}>
                <LoadingIndicator size="sm" label="Getting rows…" />
              </Skeleton>
            )}

            {rowsOpen && !loadingRows && (
              <div className="accordion-list" style={{ marginTop: 12 }}>
                {rowsResponse?.rows.map((row, i) => {
                  const pkValue = row[selectedTable.primaryKey];
                  const label = pkValue !== undefined && pkValue !== null ? `${selectedTable.primaryKey}: ${pkValue}` : `Row ${offset + i + 1}`;
                  return (
                    <AccordionItem key={i} label={label} expanded={expandedRows.has(i)} onToggle={() => toggleRow(i)}>
                      {columnOrder.map((name) => (
                        <AccordionField key={name} label={name} value={formatCell(row[name])} />
                      ))}
                    </AccordionItem>
                  );
                })}
                {rowsResponse && rowsResponse.rows.length === 0 && (
                  <div className="meta-text" style={{ padding: "12px 4px" }}>
                    No rows.
                  </div>
                )}
              </div>
            )}
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

// A tap-to-expand row per record, showing just its label until opened.
// Used for both the Schema and Rows sections instead of a wide scrolling table.
function AccordionItem({ label, expanded, onToggle, children }: { label: ReactNode; expanded: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="accordion-item">
      <button className="accordion-header" onClick={onToggle}>
        <span>{label}</span>
        <span className="accordion-chevron">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && <div className="accordion-body">{children}</div>}
    </div>
  );
}

function AccordionField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="accordion-field">
      <span className="field-label">{label}</span>
      <span>{value}</span>
    </div>
  );
}
