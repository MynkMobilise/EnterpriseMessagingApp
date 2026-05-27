import { useEffect, useState } from 'react';
import { Settings2, ToggleLeft, ToggleRight, Save, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';

// Super-admin page. Lists every tenant, lets you flip per-tenant feature
// flags on top of the plan baseline. Plan baselines live in code
// (backend/src/config/planFeatures.js); this page only writes to
// organizations.feature_overrides.
//
// Per-tenant payload shape (matches GET /organizations/:id/features):
//   { plan, baseline, overrides, effective, keys: [{ key, label, group }] }
//
// We render one tenant at a time inside an inline panel — cleaner than a
// massive matrix for small/medium org counts and avoids accidental
// cross-tenant edits.

interface Tenant {
  id: number;
  name: string;
  slug?: string;
  plan?: string;
  status?: string;
}

interface FeatureKeyDef { key: string; label: string; group: string }

interface FeaturesPayload {
  organizationId: number;
  plan: string;
  baseline: any;
  overrides: any;
  effective: any;
  keys: FeatureKeyDef[];
}

function readDotted(obj: any, dotted: string): any {
  return dotted.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

function setDotted(obj: any, dotted: string, value: any): any {
  const out = { ...(obj || {}) };
  const path = dotted.split('.');
  let cursor: any = out;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    cursor[k] = { ...(cursor[k] || {}) };
    cursor = cursor[k];
  }
  cursor[path[path.length - 1]] = value;
  return out;
}

function unsetDotted(obj: any, dotted: string): any {
  if (!obj) return obj;
  const out = JSON.parse(JSON.stringify(obj));
  const path = dotted.split('.');
  let cursor: any = out;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (cursor[k] == null) return out;
    cursor = cursor[k];
  }
  delete cursor[path[path.length - 1]];
  // Prune empty nested objects so the saved override stays tidy.
  for (let i = path.length - 2; i >= 0; i--) {
    let nested: any = out;
    for (let j = 0; j < i; j++) nested = nested[path[j]];
    const childKey = path[i];
    const child = nested[childKey];
    if (child && typeof child === 'object' && Object.keys(child).length === 0) {
      delete nested[childKey];
    }
  }
  return out;
}

export function TenantFeatures() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [features, setFeatures] = useState<FeaturesPayload | null>(null);
  const [pendingOverrides, setPendingOverrides] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [pendingMaxRoles, setPendingMaxRoles] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await apiService.organizations.list();
        const list = Array.isArray(r?.data) ? r.data : (r?.data?.organizations || []);
        setTenants(list);
        if (list.length > 0) setActiveId(list[0].id);
      } catch (e: any) {
        toast.error('Failed to load tenants', { description: e?.message });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (activeId == null) return;
    const load = async () => {
      try {
        const r = await apiService.organizations.getFeatures(activeId);
        if (r?.success) {
          setFeatures(r.data);
          setPendingOverrides(r.data.overrides || {});
          setPendingMaxRoles(
            r.data.overrides?.maxCustomRoles !== undefined
              ? r.data.overrides.maxCustomRoles
              : null
          );
        }
      } catch (e: any) {
        toast.error('Failed to load tenant features', { description: e?.message });
      }
    };
    load();
  }, [activeId]);

  const filtered = tenants.filter((t) =>
    !search.trim() || (t.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const effectiveValueFor = (dotted: string): any => {
    if (!features) return undefined;
    // Merge baseline + pendingOverrides so the toggle reflects what would
    // happen on save, not what's currently persisted.
    const merged = JSON.parse(JSON.stringify(features.baseline));
    function deepMerge(a: any, b: any) {
      for (const [k, v] of Object.entries(b || {})) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          a[k] = deepMerge({ ...(a[k] || {}) }, v);
        } else {
          a[k] = v;
        }
      }
      return a;
    }
    deepMerge(merged, pendingOverrides);
    return readDotted(merged, dotted);
  };

  const baselineValueFor = (dotted: string): any =>
    features ? readDotted(features.baseline, dotted) : undefined;

  const isOverridden = (dotted: string): boolean =>
    features ? readDotted(pendingOverrides, dotted) !== undefined : false;

  const toggleFeature = (dotted: string) => {
    const current = effectiveValueFor(dotted);
    const baseline = baselineValueFor(dotted);
    const desired = !current;
    if (desired === baseline) {
      // Flipping back to the baseline value → remove the override key so the
      // saved JSON stays minimal and the row visibly returns to "Plan default".
      setPendingOverrides(unsetDotted(pendingOverrides, dotted));
    } else {
      setPendingOverrides(setDotted(pendingOverrides, dotted, desired));
    }
  };

  const resetFeature = (dotted: string) => {
    setPendingOverrides(unsetDotted(pendingOverrides, dotted));
  };

  const handleMaxRolesChange = (val: string) => {
    const n = val === '' ? null : Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    setPendingMaxRoles(n);
    if (n === null) {
      setPendingOverrides(unsetDotted(pendingOverrides, 'maxCustomRoles'));
    } else if (n !== (features?.baseline?.maxCustomRoles ?? 0)) {
      setPendingOverrides(setDotted(pendingOverrides, 'maxCustomRoles', n));
    } else {
      // Matches baseline; remove override so the row reads as "plan default".
      setPendingOverrides(unsetDotted(pendingOverrides, 'maxCustomRoles'));
    }
  };

  const onSave = async () => {
    if (activeId == null) return;
    setSaving(true);
    try {
      const r = await apiService.organizations.updateFeatures(activeId, pendingOverrides);
      if (r?.success) {
        toast.success('Tenant features updated');
        setFeatures((prev) => prev ? { ...prev, overrides: r.data.overrides, effective: r.data.effective } : prev);
      }
    } catch (e: any) {
      toast.error('Failed to save', { description: e?.response?.data?.error?.message || e?.message });
    } finally {
      setSaving(false);
    }
  };

  const onResetAll = async () => {
    if (activeId == null) return;
    if (!confirm('Reset this tenant to plan defaults? Every per-tenant override will be cleared.')) return;
    setSaving(true);
    try {
      const r = await apiService.organizations.updateFeatures(activeId, {});
      if (r?.success) {
        setPendingOverrides({});
        setPendingMaxRoles(null);
        toast.success('Tenant reset to plan defaults');
        setFeatures((prev) => prev ? { ...prev, overrides: {}, effective: r.data.effective } : prev);
      }
    } catch (e: any) {
      toast.error('Failed to reset', { description: e?.response?.data?.error?.message || e?.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading tenants…</div>;
  }

  // Group feature keys by their `group` for visual breakup.
  const grouped: { [group: string]: FeatureKeyDef[] } = {};
  for (const k of (features?.keys || [])) {
    if (!grouped[k.group]) grouped[k.group] = [];
    grouped[k.group].push(k);
  }

  const dirty = JSON.stringify(pendingOverrides) !== JSON.stringify(features?.overrides || {});

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Settings2 className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white">Tenant Features</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Per-tenant feature flags. Baselines come from each tenant's plan; overrides apply on top.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tenant list */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tenants…"
                  className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-500">No tenants match.</div>
              )}
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-800 transition-colors ${
                    activeId === t.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="font-medium truncate">{t.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{t.plan || 'starter'} · {t.status || 'active'}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature toggles for the active tenant */}
        <div className="lg:col-span-3 space-y-4">
          {!features ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 text-gray-500">
              Pick a tenant on the left.
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h2 className="text-lg text-gray-900 dark:text-white">
                      {tenants.find((t) => t.id === activeId)?.name}
                    </h2>
                    <p className="text-xs text-gray-500 capitalize">
                      Plan: <strong>{features.plan}</strong> — baseline from <code>planFeatures.js</code>; overrides below.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onResetAll}
                      disabled={saving}
                      className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset all
                    </button>
                    <button
                      onClick={onSave}
                      disabled={!dirty || saving}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      {saving ? 'Saving…' : (dirty ? 'Save changes' : 'No changes')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Grouped feature toggles */}
              {Object.entries(grouped).map(([group, keys]) => (
                <div key={group} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-900 dark:text-white">
                    {group}
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {keys.map((k) => {
                      const v = !!effectiveValueFor(k.key);
                      const overridden = isOverridden(k.key);
                      return (
                        <div key={k.key} className="px-5 py-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white">{k.label}</div>
                            <div className="text-xs text-gray-500">
                              Plan default: <strong>{baselineValueFor(k.key) ? 'On' : 'Off'}</strong>
                              {overridden && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                  Overridden
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {overridden && (
                              <button
                                onClick={() => resetFeature(k.key)}
                                className="text-xs text-gray-400 hover:text-red-600"
                                title="Remove the per-tenant override and fall back to the plan default"
                              >
                                Reset
                              </button>
                            )}
                            <button
                              onClick={() => toggleFeature(k.key)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                v
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {v ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                              {v ? 'On' : 'Off'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Numeric override — max custom roles. Lives in its own card
                  because it isn't a boolean and doesn't fit the toggle UI. */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-gray-900 dark:text-white">Max custom roles (Phase 2 feature)</div>
                    <div className="text-xs text-gray-500">
                      Plan default: <strong>{features.baseline.maxCustomRoles ?? 0}</strong>
                      {pendingMaxRoles !== null && pendingMaxRoles !== (features.baseline.maxCustomRoles ?? 0) && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          Overridden
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={pendingMaxRoles ?? (features.baseline.maxCustomRoles ?? 0)}
                    onChange={(e) => handleMaxRolesChange(e.target.value)}
                    className="w-24 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white text-right"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
