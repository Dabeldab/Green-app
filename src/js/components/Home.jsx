import React, { useMemo, useRef, useState } from "react";
import apiService from "../services/api";

// Bulk Inventory & Pricing Admin — Nova Products + Inventory schemas
// Tailwind-only, previewable UI. Wire endpoints to your API. – Big Buddy edition

// ------------------------------
// Helper UI bits
// ------------------------------
const Badge = ({ children, variant = "neutral" }) => {
  const styles = {
    neutral: "bg-gray-100 text-gray-700",
    ok: "bg-green-100 text-green-800",
    warn: "bg-yellow-100 text-yellow-800",
    err: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  }[variant];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
};

const Card = ({ title, actions, children, className = "" }) => (
  <div className={`rounded-2xl shadow-sm border border-gray-200 bg-white ${className}`}>
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <div className="flex gap-2">{actions}</div>
    </div>
    <div className="p-4 sm:p-6">{children}</div>
  </div>
);

const Button = ({ children, onClick, variant = "primary", disabled }) => {
  const style = {
    primary: "bg-black text-white hover:bg-gray-900",
    outline: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-sm font-medium ${style} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
};

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-gray-300"
      checked={checked}
      onChange={(e) => onChange?.(e.target.checked)}
    />
    <span className="text-gray-700">{label}</span>
  </label>
);

const Select = ({ value, onChange, children }) => (
  <select
    value={value}
    onChange={(e) => onChange?.(e.target.value)}
    className="rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white"
  >
    {children}
  </select>
);

// ------------------------------
// Schemas (Inventory vs Products)
// ------------------------------
const SCHEMAS = {
  products: {
    label: "Products (Nova)",
    keyFields: ["ProductID", "SKU"],
    columns: [
      "ProductID","ProductName","ProductPhoto","ProductDescription","ProductCostPrice","ProductMinPrice","ProductMarkupPrice","ProductIsAvailable","BarcodeNumber","BarcodeNumber2","Color","WholesalerID","ProductComission","Product_CategoryID","IsFixedPrice","Size","Attr","IsDiffTaxRate","DiffTaxRate","IsLockProductMarkupPrice","IsTaxIncluded","SKU","LastPurchaseCostPrice","IsLockProductMinimumPrice","CommissionType","Version","IsTracked","VariantName1","VariantName2","ProductFamilyId","CreatedBy","CreatedOn","ShopifyId"
    ],
    numeric: ["ProductCostPrice","ProductMinPrice","ProductMarkupPrice","ProductComission","WholesalerID","Product_CategoryID","DiffTaxRate","Version","ProductFamilyId","ShopifyId"],
    boolean: ["ProductIsAvailable","IsFixedPrice","IsDiffTaxRate","IsLockProductMarkupPrice","IsTaxIncluded","IsLockProductMinimumPrice","IsTracked"],
    sample: `ProductID,ProductName,ProductPhoto,ProductDescription,ProductCostPrice,ProductMinPrice,ProductMarkupPrice,ProductIsAvailable,BarcodeNumber,BarcodeNumber2,Color,WholesalerID,ProductComission,Product_CategoryID,IsFixedPrice,Size,Attr,IsDiffTaxRate,DiffTaxRate,IsLockProductMarkupPrice,IsTaxIncluded,SKU,LastPurchaseCostPrice,IsLockProductMinimumPrice,CommissionType,Version,IsTracked,VariantName1,VariantName2,ProductFamilyId,CreatedBy,CreatedOn,ShopifyId
11111111-1111-1111-1111-111111111111,USB-C Wall Charger 30W,,,25.00,27.50,41.99,TRUE,,,Black,1,0.00,5,FALSE,,,FALSE,0.00,FALSE,TRUE,A100,25.00,FALSE,Percentage,1,TRUE,,,1,,,`,
    warnings: (r) => {
      const w = [];
      if (r.ProductMinPrice && r.ProductMarkupPrice && Number(r.ProductMinPrice) > Number(r.ProductMarkupPrice)) {
        w.push({ field: "ProductMinPrice", type: "warn", msg: "Min price exceeds markup price" });
      }
      return w;
    }
  },
  inventory: {
    label: "Inventory (Nova)",
    keyFields: ["LocationID", "ProductID", "SKU"],
    columns: ["InventoryID","LocationID","ProductID","SKU","Quantity","DesiredQuantity","MinimumQuantity","Version"],
    numeric: ["Quantity","DesiredQuantity","MinimumQuantity","Version"],
    boolean: [],
    sample: `LocationID,ProductID,SKU,Quantity,DesiredQuantity,MinimumQuantity,Version
MIAMI,11111111-1111-1111-1111-111111111111,A100,12,20,5,3
NYC,,B200,8,15,3,1`,
    warnings: (r) => {
      const w = [];
      if (r.Quantity && r.MinimumQuantity && Number(r.Quantity) < Number(r.MinimumQuantity)) {
        w.push({ field: "Quantity", type: "warn", msg: "Quantity below minimum" });
      }
      return w;
    }
  }
};

// ------------------------------
// Small helpers for inventory audit UX
// ------------------------------
const INVENTORY_DEFAULT_COMMENT = "Current quantity was changed";

// ------------------------------
// CSV helpers
// ------------------------------
function parseCsv(text) {
  const [header, ...rows] = text.trim().split("\n");
  const cols = header.split(",");
  return rows.map((r) => {
    const raw = r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    const obj = {};
    cols.forEach((c, i) => (obj[c] = raw[i]?.replaceAll('"', '')));
    return obj;
  });
}

function validateRows(rows, schemaKey) {
  const schema = SCHEMAS[schemaKey];
  const issues = [];
  const seen = new Set();
  rows.forEach((r, idx) => {
    // Key validation: Inventory requires LocationID and at least one of ProductID/SKU
    if (schemaKey === 'inventory') {
      if (!r.LocationID) issues.push({ idx, field: 'LocationID', type: 'err', msg: 'LocationID required' });
      if (!r.ProductID && !r.SKU) issues.push({ idx, field: 'ProductID/SKU', type: 'err', msg: 'Provide ProductID or SKU' });
    } else {
      const keyValues = schema.keyFields.map((f) => r[f]).filter(Boolean);
      if (keyValues.length === 0) issues.push({ idx, field: schema.keyFields.join("/"), type: "err", msg: "At least one key must be provided" });
    }
    const keyParts = schema.keyFields.map((f) => r[f]).filter(Boolean);
    const key = keyParts.join("__");
    if (key && seen.has(key)) issues.push({ idx, field: schema.keyFields.join("/"), type: "warn", msg: "Duplicate key in file" });
    if (key) seen.add(key);

    // Numeric + Boolean checks
    schema.numeric?.forEach((f) => {
      if (r[f] !== undefined && r[f] !== "" && !Number.isFinite(Number(r[f]))) issues.push({ idx, field: f, type: "err", msg: "Must be numeric" });
    });
    schema.boolean?.forEach((f) => {
      if (r[f] !== undefined && r[f] !== "") {
        const v = String(r[f]).toLowerCase();
        if (!["true","false","0","1"].includes(v)) issues.push({ idx, field: f, type: "err", msg: "Bool expected (TRUE/FALSE)" });
      }
    });

    // Custom warnings per schema
    issues.push(...(schema.warnings?.(r) || []).map((w) => ({ ...w, idx })));
  });
  return issues;
}

// Example existing snapshot maps (for diff demo only)
const existingProducts = new Map([
  ["11111111-1111-1111-1111-111111111111", { ProductName: "USB-C Wall Charger 30W", ProductMarkupPrice: 41.99, ProductMinPrice: 27.50, ProductIsAvailable: true, SKU: "A100" }],
]);
const existingInventory = new Map([
  ["11111111-1111-1111-1111-111111111111__MIAMI", { Quantity: 10, DesiredQuantity: 20, MinimumQuantity: 5, Version: 2 }],
]);

function computeDiff(rows, schemaKey) {
  const schema = SCHEMAS[schemaKey];
  return rows.map((r) => {
    let key = '';
    let prev = {};
    if (schemaKey === "products") {
      const pid = r.ProductID || '';
      key = pid || r.SKU || '';
      prev = existingProducts.get(pid) || {};
    } else {
      const pid = r.ProductID || 'PID?';
      const loc = r.LocationID || 'LOC?';
      key = `${pid}__${loc}`;
      prev = existingInventory.get(`${pid}__${loc}`) || {};
    }
    const changes = [];
    schema.columns.forEach((f) => {
      if (!(f in r)) return; // ignore columns not provided
      const oldVal = prev[f] ?? null;
      const newVal = r[f] ?? null;
      if ((oldVal ?? "") !== (newVal ?? "")) changes.push({ field: f, oldVal, newVal });
    });
    const display = schemaKey === 'products'
      ? (r.ProductName || r.SKU || r.ProductID)
      : `${r.SKU ? r.SKU + ' • ' : ''}${r.LocationID} (${r.ProductID || 'resolve via SKU'})`;
    return { key, changes, display };
  });
}

// ------------------------------
// Main Component
// ------------------------------
export default function BulkInventoryAndPricingTool({ onLogout }) {
  const [activeTab, setActiveTab] = useState("upload");
  const [schemaKey, setSchemaKey] = useState("products"); // default to Products
  const [rows, setRows] = useState([]);
  const [issues, setIssues] = useState([]);
  const [diffs, setDiffs] = useState([]);
  const [opts, setOpts] = useState({ upsert: true, transactional: true, dryRun: true });
  const [batchName, setBatchName] = useState("");
  const [applyResult, setApplyResult] = useState(null);
  const [employeeId, setEmployeeId] = useState("");
  const [reason, setReason] = useState(INVENTORY_DEFAULT_COMMENT);
  const [isApplying, setIsApplying] = useState(false);
  const fileRef = useRef(null);

  const severityCounts = useMemo(() => ({
    err: issues.filter((i) => i.type === "err").length,
    warn: issues.filter((i) => i.type === "warn").length,
    info: issues.filter((i) => i.type === "info").length,
  }), [issues]);

  function handleLoadSample() {
    const sample = SCHEMAS[schemaKey].sample;
    const parsed = parseCsv(sample);
    setRows(parsed);
    const val = validateRows(parsed, schemaKey);
    setIssues(val);
    setDiffs(computeDiff(parsed, schemaKey));
    setActiveTab("grid");
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const parsed = parseCsv(text);
      setRows(parsed);
      const val = validateRows(parsed, schemaKey);
      setIssues(val);
      setDiffs(computeDiff(parsed, schemaKey));
      setActiveTab("grid");
    };
    reader.readAsText(file);
  }

  function removeRow(index) {
    const next = rows.slice();
    next.splice(index, 1);
    setRows(next);
    const val = validateRows(next, schemaKey);
    setIssues(val);
    setDiffs(computeDiff(next, schemaKey));
  }

  async function applyChanges() {
    setIsApplying(true);
    try {
      // Call the appropriate API endpoint based on schema
      const apiOptions = {
        upsert: opts.upsert,
        transactional: opts.transactional,
        dryRun: opts.dryRun,
        batchName: batchName || `${schemaKey === 'products' ? 'Products' : 'Inventory'}-${new Date().toISOString().split('T')[0]}`,
        ...(schemaKey === 'inventory' && {
          employeeId: employeeId || null,
          reason: reason || INVENTORY_DEFAULT_COMMENT
        })
      };

      let result;
      if (schemaKey === 'products') {
        result = await apiService.bulkUpdateProducts(rows, apiOptions);
      } else {
        result = await apiService.bulkUpdateInventory(rows, apiOptions);
      }

      // Display the result from the API
      setApplyResult({
        batchId: result.batchId || 'N/A',
        schema: schemaKey,
        dryRun: opts.dryRun,
        transactional: opts.transactional,
        upsert: opts.upsert,
        created: result.created || 0,
        updated: result.updated || diffs.reduce((a, d) => a + (d.changes.length ? 1 : 0), 0),
        skipped: result.skipped || 0,
        employeeId: schemaKey === 'inventory' ? employeeId : undefined,
        reason: schemaKey === 'inventory' ? reason : undefined,
        message: result.message || 'Changes applied successfully'
      });
      
      // If not dry run and successful, could clear the form
      if (!opts.dryRun && result.success) {
        // Optionally reset or keep for review
      }
    } catch (error) {
      console.error('Apply changes failed:', error);
      setApplyResult({
        error: true,
        message: error.message || 'Failed to apply changes. Please try again.',
        schema: schemaKey,
        dryRun: opts.dryRun
      });
    } finally {
      setIsApplying(false);
    }
  }

  const schema = SCHEMAS[schemaKey];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Bulk Inventory & Pricing Admin</h1>
            <p className="text-gray-600 mt-1">Upload a CSV/XLSX, validate, preview diffs, and apply changes to <strong>{schemaKey === 'products' ? 'Products' : 'Inventory'}</strong> with audit logging & rollback.</p>
          </div>
          {onLogout && (
            <Button variant="outline" onClick={onLogout}>
              Logout
            </Button>
          )}
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id: "upload", label: "1) Upload" },
            { id: "grid", label: "2) Edit Grid" },
            { id: "review", label: "3) Review & Apply" },
            { id: "audit", label: "Audit Log" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border ${activeTab === t.id ? "bg-black text-white border-black" : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "upload" && (
          <div className="grid lg:grid-cols-3 gap-4">
            <Card
              title="Upload file"
              actions={
                <div className="flex items-center gap-2">
                  <Select value={schemaKey} onChange={setSchemaKey}>
                    <option value="products">Products (Nova)</option>
                    <option value="inventory">Inventory (Nova)</option>
                  </Select>
                  <Button variant="outline" onClick={handleLoadSample}>Load sample data</Button>
                </div>
              }
              className="lg:col-span-2"
            >
              <div className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-gray-50">
                <div className="text-sm text-gray-600">Drag & drop CSV/XLSX here or</div>
                <div className="mt-2">
                  <input type="file" ref={fileRef} className="hidden" onChange={handleFile} accept=".csv,.xlsx" />
                  <Button onClick={() => fileRef.current?.click()}>Choose file</Button>
                </div>
                <p className="text-xs text-gray-500 mt-3">Expected headers: <code>{schema.columns.join(', ')}</code></p>
                <p className="text-xs text-gray-400 mt-1">(Extra columns are ignored; missing columns are left unchanged.)</p>
              </div>
            </Card>

            <Card title="Options">
              <div className="space-y-3">
                <Toggle checked={opts.upsert} onChange={(v) => setOpts({ ...opts, upsert: v })} label="Upsert (insert if key not found)" />
                <Toggle checked={opts.transactional} onChange={(v) => setOpts({ ...opts, transactional: v })} label="Transactional (all-or-nothing)" />
                <Toggle checked={opts.dryRun} onChange={(v) => setOpts({ ...opts, dryRun: v })} label="Dry run (simulate only)" />
                <div className="pt-2">
                  <label className="block text-xs text-gray-500 mb-1">Name this batch (for rollback/audit)</label>
                  <input value={batchName} onChange={(e) => setBatchName(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. Oct22-Inventory-Recount" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "grid" && (
          <div className="grid gap-4">
            <Card
              title="Data quality"
              actions={
                <div className="flex items-center gap-2">
                  <Badge variant="err">Errors: {severityCounts.err}</Badge>
                  <Badge variant="warn">Warnings: {severityCounts.warn}</Badge>
                  <Badge variant="info">Info: {severityCounts.info}</Badge>
                </div>
              }
            >
              <ul className="text-sm text-gray-700 space-y-1 max-h-32 overflow-auto">
                {issues.length === 0 && <li className="text-gray-500">No issues detected.</li>}
                {issues.map((i, k) => (
                  <li key={k} className="flex items-center gap-2">
                    <Badge variant={i.type}>{i.type.toUpperCase()}</Badge>
                    <span>Row {i.idx + 2} • <strong>{i.field}</strong> — {i.msg}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card
              title={`Edit grid (${SCHEMAS[schemaKey].label})`}
              actions={<Button variant="primary" onClick={() => setActiveTab("review")} disabled={rows.length === 0}>Continue to Review</Button>}
            >
              <div className="overflow-auto border border-gray-200 rounded-xl">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['', ...new Set(rows.flatMap(r => Object.keys(r)))].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={idx} className="odd:bg-white even:bg-gray-50">
                        <td className="px-3 py-1"><Button variant="ghost" onClick={() => removeRow(idx)}>Remove</Button></td>
                        {Object.keys(r).map((k) => (
                          <td key={k} className="px-3 py-1 whitespace-nowrap">
                            <input
                              value={r[k]}
                              onChange={(e) => {
                                const next = rows.slice();
                                next[idx] = { ...r, [k]: e.target.value };
                                setRows(next);
                                setIssues(validateRows(next, schemaKey));
                                setDiffs(computeDiff(next, schemaKey));
                              }}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "review" && (
          <div className="grid lg:grid-cols-3 gap-4">
            <Card title="Change summary" className="lg:col-span-1">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>Rows</span><span className="font-semibold">{rows.length}</span></div>
                <div className="flex items-center justify-between"><span>With changes</span><span className="font-semibold">{diffs.filter(d => d.changes.length).length}</span></div>
                <div className="flex items-center justify-between"><span>Errors</span><span className="font-semibold">{severityCounts.err}</span></div>
                <div className="flex items-center justify-between"><span>Warnings</span><span className="font-semibold">{severityCounts.warn}</span></div>
                <div className="pt-3 space-y-2">
                  <Toggle checked={opts.upsert} onChange={(v)=>setOpts({...opts, upsert: v})} label="Upsert new keys" />
                  <Toggle checked={opts.transactional} onChange={(v)=>setOpts({...opts, transactional: v})} label="Transactional (all-or-nothing)" />
                  <Toggle checked={opts.dryRun} onChange={(v)=>setOpts({...opts, dryRun: v})} label="Dry run" />
                </div>
                <div className="pt-3">
                  <label className="block text-xs text-gray-500 mb-1">Batch name</label>
                  <input value={batchName} onChange={(e)=>setBatchName(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. Oct22-Inventory-Recount" />
                </div>

                {schemaKey === 'inventory' && (
                  <div className="pt-3 grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Employee ID (for Inventory_Transactions)</label>
                      <input value={employeeId} onChange={(e)=>setEmployeeId(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. 43" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Reason / Comment</label>
                      <textarea value={reason} onChange={(e)=>setReason(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" rows={2} placeholder={INVENTORY_DEFAULT_COMMENT} />
                      <p className="text-[11px] text-gray-500 mt-1">Will populate <code>Inventory_Transactions.Comment</code>. Default mirrors your convention: “Current quantity was changed”.</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-2">
                  <Button variant="primary" onClick={applyChanges} disabled={rows.length===0 || severityCounts.err>0 || isApplying}>
                    {isApplying ? "Applying..." : "Apply changes"}
                  </Button>
                  <Button variant="outline" onClick={()=>setActiveTab("grid")} disabled={isApplying}>Back</Button>
                </div>
                {severityCounts.err>0 && <p className="text-xs text-red-600 pt-2">Resolve errors before applying.</p>}
              </div>
            </Card>

            <Card title="Diff preview" className="lg:col-span-2">
              <div className="max-h-[480px] overflow-auto">
                {diffs.map((d, i) => (
                  <div key={i} className="border-b border-gray-100 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold truncate">{d.display || d.key}</div>
                      <Badge variant={d.changes.length?"info":"neutral"}>{d.changes.length?`${d.changes.length} change(s)`:"No change"}</Badge>
                    </div>
                    {d.changes.length>0 && (
                      <div className="mt-2 grid sm:grid-cols-2 gap-3">
                        {d.changes.map((c, k) => (
                          <div key={k} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                            <div className="text-xs text-gray-500">{c.field}</div>
                            <div className="text-sm"><span className="line-through text-gray-500 mr-2">{String(c.oldVal)}</span>→ <span className="font-medium">{String(c.newVal)}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {applyResult && (
              <Card title={applyResult.error ? "Error" : "Apply result"} className="lg:col-span-3">
                {applyResult.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <span className="text-red-600 text-sm font-semibold">❌</span>
                      <div>
                        <p className="text-sm text-red-800 font-semibold">Failed to apply changes</p>
                        <p className="text-sm text-red-700 mt-1">{applyResult.message}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {applyResult.message && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 text-sm text-green-800">
                        ✓ {applyResult.message}
                      </div>
                    )}
                    <div className="text-sm grid sm:grid-cols-3 gap-2">
                      <div><span className="text-gray-500">Batch ID</span><div className="font-semibold">{applyResult.batchId}</div></div>
                      <div><span className="text-gray-500">Scope</span><div className="font-semibold">{applyResult.schema === 'products' ? 'Products' : 'Inventory'}</div></div>
                      <div><span className="text-gray-500">Options</span><div className="font-semibold">{applyResult.dryRun?"Dry run":"Live"} • {applyResult.transactional?"Transactional":"Per-row"} • {applyResult.upsert?"Upsert":"Update-only"}</div></div>
                      <div><span className="text-gray-500">Summary</span><div className="font-semibold">{applyResult.updated} updated • {applyResult.created} rows processed • {applyResult.skipped} skipped</div></div>
                      {applyResult.schema === 'inventory' && (
                        <div className="sm:col-span-3 text-xs text-gray-600">
                          <div>EmployeeID for audit: <span className="font-semibold">{applyResult.employeeId || '—'}</span></div>
                          <div>Comment for audit: <span className="font-semibold">{applyResult.reason || INVENTORY_DEFAULT_COMMENT}</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {activeTab === "audit" && (
          <div className="grid gap-4">
            <Card title="Recent batches">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Batch ID","Name","User","When","Mode","Summary","Rollback"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "OCT22A1", name: "Oct22-Products-MinPriceLock", user: "bbuddy", when: "2025-10-22 13:05", mode: "Live • Txn • Upsert", summary: "82 updated, 4 inserted, 0 skipped" },
                    { id: "OCT21B2", name: "Oct21-Inventory-Recount", user: "darius", when: "2025-10-21 18:47", mode: "Live • Txn • Update-only", summary: "124 updated" },
                  ].map((b) => (
                    <tr key={b.id} className="odd:bg-white even:bg-gray-50">
                      <td className="px-3 py-2 font-mono">{b.id}</td>
                      <td className="px-3 py-2">{b.name}</td>
                      <td className="px-3 py-2">{b.user}</td>
                      <td className="px-3 py-2">{b.when}</td>
                      <td className="px-3 py-2">{b.mode}</td>
                      <td className="px-3 py-2">{b.summary}</td>
                      <td className="px-3 py-2"><Button variant="danger" onClick={()=>alert(`Rollback ${b.id}`)}>Rollback</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Audit detail (example)">
              <div className="text-sm text-gray-700 space-y-2">
                <p>Per-field before/after values with who/when and reason. Example:</p>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-auto text-xs">
{`ChangeAudit
- BatchID: OCT22A1
- User: bbuddy
- Timestamp: 2025-10-22T13:05:22Z
- Entity: Inventory
- Key: ProductID=11111111-1111-1111-1111-111111111111; LocationID=MIAMI
- Changes:
  • Quantity: 10 -> 12
  • DesiredQuantity: 18 -> 20
`}
                </pre>
              </div>
            </Card>
          </div>
        )}

        {/* Footer blueprint: backend + SQL outline for Nova */}
        <div className="mt-8 text-xs text-gray-600 space-y-4">
          <p><strong>Backend endpoints (suggested):</strong> <code>POST /api/bulk/parse</code>, <code>POST /api/bulk/validate</code>, <code>POST /api/bulk/apply</code>, <code>GET /api/audit</code>, <code>POST /api/rollback/:batchId</code></p>
          <p><strong>DB pattern:</strong> staging table ➜ MERGE into <code>Products</code>/<code>Inventory</code> inside a transaction ➜ write <code>ChangeAudit</code> per-field ➜ <code>ChangeBatch</code> summary.</p>

          <details className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <summary className="cursor-pointer font-semibold">T-SQL MERGE (Products) — tailored to your columns</summary>
            <pre className="text-[11px] leading-5 overflow-auto">
{`-- Staging table example
CREATE TABLE dbo.Stg_Products (
  BatchID UNIQUEIDENTIFIER,
  ProductID UNIQUEIDENTIFIER NULL,
  SKU NVARCHAR(64) NULL,
  ProductName NVARCHAR(256) NULL,
  ProductPhoto NVARCHAR(512) NULL,
  ProductDescription NVARCHAR(MAX) NULL,
  ProductCostPrice DECIMAL(18,2) NULL,
  ProductMinPrice DECIMAL(18,2) NULL,
  ProductMarkupPrice DECIMAL(18,2) NULL,
  ProductIsAvailable BIT NULL,
  BarcodeNumber NVARCHAR(64) NULL,
  BarcodeNumber2 NVARCHAR(64) NULL,
  Color NVARCHAR(64) NULL,
  WholesalerID INT NULL,
  ProductComission DECIMAL(18,4) NULL,
  Product_CategoryID INT NULL,
  IsFixedPrice BIT NULL,
  Size NVARCHAR(64) NULL,
  Attr NVARCHAR(256) NULL,
  IsDiffTaxRate BIT NULL,
  DiffTaxRate DECIMAL(6,3) NULL,
  IsLockProductMarkupPrice BIT NULL,
  IsTaxIncluded BIT NULL,
  LastPurchaseCostPrice DECIMAL(18,2) NULL,
  IsLockProductMinimumPrice BIT NULL,
  CommissionType NVARCHAR(32) NULL,
  Version INT NULL,
  IsTracked BIT NULL,
  VariantName1 NVARCHAR(64) NULL,
  VariantName2 NVARCHAR(64) NULL,
  ProductFamilyId INT NULL,
  CreatedBy NVARCHAR(64) NULL,
  CreatedOn DATETIME2 NULL,
  ShopifyId BIGINT NULL
);
GO

-- Key resolution: prefer ProductID, else match by SKU
;WITH S AS (
  SELECT * FROM dbo.Stg_Products WHERE BatchID = @BatchID
)
MERGE dbo.Products AS T
USING S ON (
  (S.ProductID IS NOT NULL AND T.ProductID = S.ProductID)
   OR (S.ProductID IS NULL AND S.SKU IS NOT NULL AND T.SKU = S.SKU)
)
WHEN MATCHED THEN UPDATE SET
  T.ProductName = COALESCE(S.ProductName, T.ProductName),
  T.ProductPhoto = COALESCE(S.ProductPhoto, T.ProductPhoto),
  T.ProductDescription = COALESCE(S.ProductDescription, T.ProductDescription),
  T.ProductCostPrice = COALESCE(S.ProductCostPrice, T.ProductCostPrice),
  T.ProductMinPrice = COALESCE(S.ProductMinPrice, T.ProductMinPrice),
  T.ProductMarkupPrice = COALESCE(S.ProductMarkupPrice, T.ProductMarkupPrice),
  T.ProductIsAvailable = COALESCE(S.ProductIsAvailable, T.ProductIsAvailable),
  T.BarcodeNumber = COALESCE(S.BarcodeNumber, T.BarcodeNumber),
  T.BarcodeNumber2 = COALESCE(S.BarcodeNumber2, T.BarcodeNumber2),
  T.Color = COALESCE(S.Color, T.Color),
  T.WholesalerID = COALESCE(S.WholesalerID, T.WholesalerID),
  T.ProductComission = COALESCE(S.ProductComission, T.ProductComission),
  T.Product_CategoryID = COALESCE(S.Product_CategoryID, T.Product_CategoryID),
  T.IsFixedPrice = COALESCE(S.IsFixedPrice, T.IsFixedPrice),
  T.Size = COALESCE(S.Size, T.Size),
  T.Attr = COALESCE(S.Attr, T.Attr),
  T.IsDiffTaxRate = COALESCE(S.IsDiffTaxRate, T.IsDiffTaxRate),
  T.DiffTaxRate = COALESCE(S.DiffTaxRate, T.DiffTaxRate),
  T.IsLockProductMarkupPrice = COALESCE(S.IsLockProductMarkupPrice, T.IsLockProductMarkupPrice),
  T.IsTaxIncluded = COALESCE(S.IsTaxIncluded, T.IsTaxIncluded),
  T.SKU = COALESCE(S.SKU, T.SKU),
  T.LastPurchaseCostPrice = COALESCE(S.LastPurchaseCostPrice, T.LastPurchaseCostPrice),
  T.IsLockProductMinimumPrice = COALESCE(S.IsLockProductMinimumPrice, T.IsLockProductMinimumPrice),
  T.CommissionType = COALESCE(S.CommissionType, T.CommissionType),
  T.Version = COALESCE(S.Version, T.Version),
  T.IsTracked = COALESCE(S.IsTracked, T.IsTracked),
  T.VariantName1 = COALESCE(S.VariantName1, T.VariantName1),
  T.VariantName2 = COALESCE(S.VariantName2, T.VariantName2),
  T.ProductFamilyId = COALESCE(S.ProductFamilyId, T.ProductFamilyId),
  T.CreatedBy = COALESCE(S.CreatedBy, T.CreatedBy),
  T.CreatedOn = COALESCE(S.CreatedOn, T.CreatedOn),
  T.ShopifyId = COALESCE(S.ShopifyId, T.ShopifyId)
WHEN NOT MATCHED BY TARGET AND @Upsert = 1 THEN
  INSERT (
    ProductID, ProductName, ProductPhoto, ProductDescription, ProductCostPrice, ProductMinPrice, ProductMarkupPrice,
    ProductIsAvailable, BarcodeNumber, BarcodeNumber2, Color, WholesalerID, ProductComission, Product_CategoryID,
    IsFixedPrice, Size, Attr, IsDiffTaxRate, DiffTaxRate, IsLockProductMarkupPrice, IsTaxIncluded, SKU,
    LastPurchaseCostPrice, IsLockProductMinimumPrice, CommissionType, Version, IsTracked, VariantName1, VariantName2,
    ProductFamilyId, CreatedBy, CreatedOn, ShopifyId
  ) VALUES (
    COALESCE(S.ProductID, NEWID()), S.ProductName, S.ProductPhoto, S.ProductDescription, S.ProductCostPrice, S.ProductMinPrice, S.ProductMarkupPrice,
    S.ProductIsAvailable, S.BarcodeNumber, S.BarcodeNumber2, S.Color, S.WholesalerID, S.ProductComission, S.Product_CategoryID,
    S.IsFixedPrice, S.Size, S.Attr, S.IsDiffTaxRate, S.DiffTaxRate, S.IsLockProductMarkupPrice, S.IsTaxIncluded, S.SKU,
    S.LastPurchaseCostPrice, S.IsLockProductMinimumPrice, S.CommissionType, S.Version, S.IsTracked, S.VariantName1, S.VariantName2,
    S.ProductFamilyId, S.CreatedBy, S.CreatedOn, S.ShopifyId
  );
`}
            </pre>
          </details>

          <details className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <summary className="cursor-pointer font-semibold">T-SQL MERGE (Inventory) — matches your columns</summary>
            <pre className="text-[11px] leading-5 overflow-auto">
{`-- Staging table for Inventory uploads
CREATE TABLE dbo.Stg_Inventory (
  BatchID UNIQUEIDENTIFIER,
  InventoryID INT NULL,              -- optional hint for direct match (not required)
  LocationID NVARCHAR(32) NOT NULL,
  ProductID UNIQUEIDENTIFIER NULL,   -- preferred key
  SKU NVARCHAR(64) NULL,             -- if provided, resolve to ProductID before MERGE
  Quantity DECIMAL(18,2) NULL,
  DesiredQuantity DECIMAL(18,2) NULL,
  MinimumQuantity DECIMAL(18,2) NULL,
  Version INT NULL
);
GO

/* Resolve ProductID from SKU prior to MERGE */
UPDATE SI
SET SI.ProductID = P.ProductID
FROM dbo.Stg_Inventory SI
JOIN dbo.Products P ON SI.ProductID IS NULL AND SI.SKU IS NOT NULL AND P.SKU = SI.SKU
WHERE SI.BatchID = @BatchID;

;WITH S AS (
  SELECT * FROM dbo.Stg_Inventory WHERE BatchID = @BatchID
)
MERGE dbo.Inventory AS T
USING S ON (T.ProductID = S.ProductID AND T.LocationID = S.LocationID)
WHEN MATCHED THEN UPDATE SET
  T.Quantity = COALESCE(S.Quantity, T.Quantity),
  T.DesiredQuantity = COALESCE(S.DesiredQuantity, T.DesiredQuantity),
  T.MinimumQuantity = COALESCE(S.MinimumQuantity, T.MinimumQuantity),
  T.Version = COALESCE(S.Version, T.Version)
WHEN NOT MATCHED BY TARGET AND @Upsert = 1 AND S.ProductID IS NOT NULL THEN
  INSERT (LocationID, ProductID, Quantity, DesiredQuantity, MinimumQuantity, Version)
  VALUES (S.LocationID, S.ProductID, COALESCE(S.Quantity,0), COALESCE(S.DesiredQuantity,0), COALESCE(S.MinimumQuantity,0), COALESCE(S.Version,1))
OUTPUT
  $action AS MergeAction,
  inserted.LocationID AS InsLocationID,
  inserted.ProductID  AS InsProductID,
  deleted.Quantity    AS OldQty,
  inserted.Quantity   AS NewQty
INTO #InvChanges;

/* Write Inventory_Transactions for quantity deltas */
INSERT dbo.Inventory_Transactions (
  ProductID, Quantity, Timestamp, SrcLocationID, DstLocationID, EmployeeID, Comment, TransactionType, TypeReferID, CostPrice, Version
)
SELECT
  c.InsProductID,
  ISNULL(c.NewQty,0) - ISNULL(c.OldQty,0) AS QuantityDelta,
  SYSUTCDATETIME() AS [Timestamp],
  NULL AS SrcLocationID,
  i.LocationID AS DstLocationID,
  @EmployeeID AS EmployeeID,
  COALESCE(@Reason, 'Current quantity was changed') AS [Comment],
  'adjust' AS TransactionType,
  NULL AS TypeReferID,
  p.ProductCostPrice AS CostPrice,
  i.Version
FROM #InvChanges c
JOIN dbo.Inventory i ON i.ProductID = c.InsProductID AND i.LocationID = c.InsLocationID
JOIN dbo.Products p ON p.ProductID = c.InsProductID
WHERE (ISNULL(c.NewQty,0) <> ISNULL(c.OldQty,0));

-- Note: TransactionID & TypeReferID are generated by SQL, we explicitly set TypeReferID=NULL for manual adjustments.
`}
            </pre>
          </details>

          <details className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <summary className="cursor-pointer font-semibold">Stored procedure wrapper — apply & audit with Inventory_Transactions</summary>
            <pre className="text-[11px] leading-5 overflow-auto">
{`CREATE OR ALTER PROCEDURE dbo.ApplyInventoryBatch
  @BatchID UNIQUEIDENTIFIER,
  @EmployeeID INT = NULL,
  @Reason NVARCHAR(200) = N'Current quantity was changed',
  @Upsert BIT = 1,
  @Transactional BIT = 1,
  @DryRun BIT = 1
AS
BEGIN
  SET NOCOUNT ON;
  IF @Transactional = 1 BEGIN TRAN;

  CREATE TABLE #InvChanges (
    MergeAction NVARCHAR(10),
    InsLocationID NVARCHAR(32),
    InsProductID UNIQUEIDENTIFIER,
    OldQty DECIMAL(18,2) NULL,
    NewQty DECIMAL(18,2) NULL
  );

  -- (include MERGE from previous block, writing OUTPUT into #InvChanges)

  IF @DryRun = 1
  BEGIN
    -- No transaction rows in dry run
    IF @Transactional = 1 ROLLBACK TRAN;
    SELECT * FROM #InvChanges; RETURN;
  END

  -- Insert Inventory_Transactions for actual deltas
  INSERT dbo.Inventory_Transactions (
    ProductID, Quantity, Timestamp, SrcLocationID, DstLocationID, EmployeeID, Comment, TransactionType, TypeReferID, CostPrice, Version
  )
  SELECT
    c.InsProductID,
    ISNULL(c.NewQty,0) - ISNULL(c.OldQty,0) AS QuantityDelta,
    SYSUTCDATETIME(),
    NULL, i.LocationID, @EmployeeID,
    @Reason, 'adjust', NULL,
    p.ProductCostPrice, i.Version
  FROM #InvChanges c
  JOIN dbo.Inventory i ON i.ProductID = c.InsProductID AND i.LocationID = c.InsLocationID
  JOIN dbo.Products p ON p.ProductID = c.InsProductID
  WHERE (ISNULL(c.NewQty,0) <> ISNULL(c.OldQty,0));

  IF @Transactional = 1 COMMIT TRAN;
END
`}
            </pre>
          </details>
          <details className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <summary className="cursor-pointer font-semibold">Tenant-safe router procs (SELECT & UPDATE Inventory across thousands of DBs)</summary>
            <pre className="text-[11px] leading-5 overflow-auto">
{`/*
Directory model (example)
-------------------------
CREATE TABLE dbo.TenantDirectory (
  TenantId INT PRIMARY KEY,
  DatabaseName SYSNAME NOT NULL,
  IsActive BIT NOT NULL DEFAULT 1
);
*/
GO

/* 1) Safe SELECT across a specific tenant DB
   - Filters by LocationID/ProductID/SKU
   - Optional Product fields
   - Paging support
*/
CREATE OR ALTER PROCEDURE dbo.usp_SelectInventory_Tenant
  @TenantId       INT,
  @LocationID     NVARCHAR(32) = NULL,
  @ProductID      UNIQUEIDENTIFIER = NULL,
  @SKU            NVARCHAR(64) = NULL,
  @IncludeProduct BIT = 1,
  @Offset         INT = 0,
  @Fetch          INT = 200
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Db SYSNAME;
  SELECT @Db = d.DatabaseName FROM dbo.TenantDirectory d WHERE d.TenantId=@TenantId AND d.IsActive=1;
  IF @Db IS NULL BEGIN RAISERROR('Unknown or inactive tenant',16,1); RETURN; END;

  DECLARE @sql NVARCHAR(MAX) = N''
    + N'SELECT i.InventoryID,i.LocationID,i.ProductID,i.Quantity,i.DesiredQuantity,i.MinimumQuantity,i.Version'
    + CASE WHEN @IncludeProduct=1 THEN N',p.SKU,p.ProductName,p.ProductCostPrice,p.ProductMarkupPrice' ELSE N'' END + N'
'
    + N'FROM ' + QUOTENAME(@Db) + N'.dbo.Inventory AS i
'
    + CASE WHEN @IncludeProduct=1 THEN N'JOIN ' + QUOTENAME(@Db) + N'.dbo.Products AS p ON p.ProductID=i.ProductID
' ELSE N'' END
    + N'WHERE 1=1
'
    + N'  AND (@LocationID IS NULL OR i.LocationID=@LocationID)
'
    + N'  AND (@ProductID IS NULL OR i.ProductID=@ProductID)
'
    + CASE WHEN @IncludeProduct=1
           THEN N'  AND (@SKU IS NULL OR p.SKU=@SKU)
'
           ELSE N'' END
    + N'ORDER BY i.ProductID
'
    + N'OFFSET @Offset ROWS FETCH NEXT @Fetch ROWS ONLY;';

  EXEC sp_executesql @sql,
    N'@LocationID nvarchar(32), @ProductID uniqueidentifier, @SKU nvarchar(64), @Offset int, @Fetch int',
    @LocationID=@LocationID, @ProductID=@ProductID, @SKU=@SKU, @Offset=@Offset, @Fetch=@Fetch;
END
GO

/* 2) Safe UPDATE for a tenant DB with audit into Inventory_Transactions
   - Either set absolute quantity (@NewQuantity) or delta (@DeltaQuantity)
   - Resolves ProductID from @SKU when needed
   - Writes Inventory_Transactions with Comment 'Current quantity was changed' unless overridden
*/
CREATE OR ALTER PROCEDURE dbo.usp_UpdateInventory_Tenant
  @TenantId        INT,
  @LocationID      NVARCHAR(32),
  @ProductID       UNIQUEIDENTIFIER = NULL,
  @SKU             NVARCHAR(64) = NULL,
  @NewQuantity     DECIMAL(18,2) = NULL,    -- absolute set
  @DeltaQuantity   DECIMAL(18,2) = NULL,    -- relative change
  @EmployeeID      INT = NULL,
  @Reason          NVARCHAR(200) = N'Current quantity was changed',
  @RunBy           NVARCHAR(64) = NULL,
  @Upsert          BIT = 0,                 -- insert if row not found
  @DryRun          BIT = 0
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  IF (@NewQuantity IS NULL AND @DeltaQuantity IS NULL) OR (@NewQuantity IS NOT NULL AND @DeltaQuantity IS NOT NULL)
  BEGIN RAISERROR('Provide exactly one of @NewQuantity or @DeltaQuantity',16,1); RETURN; END;

  DECLARE @Db SYSNAME; SELECT @Db = d.DatabaseName FROM dbo.TenantDirectory d WHERE d.TenantId=@TenantId AND d.IsActive=1;
  IF @Db IS NULL BEGIN RAISERROR('Unknown or inactive tenant',16,1); RETURN; END;

  DECLARE @sql NVARCHAR(MAX) = N'';

  -- Resolve ProductID from SKU if necessary
  IF @ProductID IS NULL AND @SKU IS NOT NULL
  BEGIN
    SET @sql = N'SELECT @OutProductID = p.ProductID FROM ' + QUOTENAME(@Db) + N'.dbo.Products p WHERE p.SKU=@InSKU;';
    DECLARE @OutProductID UNIQUEIDENTIFIER; 
    EXEC sp_executesql @sql, N'@InSKU nvarchar(64), @OutProductID uniqueidentifier OUTPUT', @InSKU=@SKU, @OutProductID=@OutProductID OUTPUT;
    SET @ProductID = @OutProductID;
  END

  IF @ProductID IS NULL BEGIN RAISERROR('ProductID/SKU not found in tenant database',16,1); RETURN; END;

  -- Build safe update that captures old/new quantities
  DECLARE @UpdateSql NVARCHAR(MAX) = N'
  DECLARE @OldQty DECIMAL(18,2);
  DECLARE @NewQty DECIMAL(18,2);

  SELECT @OldQty = i.Quantity
  FROM ' + QUOTENAME(@Db) + N'.dbo.Inventory i
  WHERE i.ProductID=@ProductID AND i.LocationID=@LocationID;

  IF @OldQty IS NULL AND @Upsert=1
  BEGIN
    INSERT ' + QUOTENAME(@Db) + N'.dbo.Inventory (LocationID, ProductID, Quantity, DesiredQuantity, MinimumQuantity, Version)
    VALUES (@LocationID, @ProductID, 0, 0, 0, 1);
    SET @OldQty = 0;
  END;

  IF @OldQty IS NULL
    RAISERROR(''Inventory row not found. Set @Upsert=1 to create.'',16,1);

  -- decide new quantity
  IF @NewQuantity IS NOT NULL SET @NewQty = @NewQuantity;
  ELSE SET @NewQty = ISNULL(@OldQty,0) + @DeltaQuantity;

  UPDATE ' + QUOTENAME(@Db) + N'.dbo.Inventory
     SET Quantity=@NewQty
   WHERE ProductID=@ProductID AND LocationID=@LocationID;

  -- Return before/after for the app
  SELECT @OldQty AS OldQty, @NewQty AS NewQty;
  ';

  DECLARE @OldQty DECIMAL(18,2), @NewQty DECIMAL(18,2);
  BEGIN TRAN;
  EXEC sp_executesql @UpdateSql,
    N'@ProductID uniqueidentifier, @LocationID nvarchar(32), @NewQuantity decimal(18,2), @DeltaQuantity decimal(18,2), @Upsert bit, @OldQty decimal(18,2) OUTPUT, @NewQty decimal(18,2) OUTPUT',
    @ProductID=@ProductID, @LocationID=@LocationID, @NewQuantity=@NewQuantity, @DeltaQuantity=@DeltaQuantity, @Upsert=@Upsert, @OldQty=@OldQty OUTPUT, @NewQty=@NewQty OUTPUT;

  IF @DryRun = 1
  BEGIN
    ROLLBACK TRAN;
    SELECT @OldQty AS OldQty, @NewQty AS NewQty;
    RETURN;
  END

  -- Write audit transaction
  INSERT dbo.Inventory_Transactions (ProductID, Quantity, Timestamp, DstLocationID, EmployeeID, Comment, TransactionType, CostPrice)
  SELECT @ProductID, (@NewQty - @OldQty), SYSUTCDATETIME(), @LocationID, @EmployeeID, @Reason, 'adjust', p.ProductCostPrice
  FROM dbo.Products p WHERE p.ProductID = @ProductID AND (@NewQty <> @OldQty);

  COMMIT TRAN;
  SELECT @OldQty AS OldQty, @NewQty AS NewQty;
END
GO
`}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}