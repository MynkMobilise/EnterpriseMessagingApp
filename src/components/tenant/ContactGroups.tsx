/**
 * Contact Groups — list, create, edit, delete groups of contacts.
 *
 * Two group modes:
 *   • Manual:  operator picks specific contacts → join-table membership.
 *   • Dynamic: operator builds a filter (department=… AND region=…) →
 *              members computed on the fly from the criteria. Adding new
 *              HRMS contacts that match the filter joins them automatically.
 *
 * The criteria builder offers AND/OR + a row-per-rule editor with the
 * whitelisted fields from the backend (department, designation, region,
 * cost center, segment, etc.) and operators (equals / in / contains / …).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Users, Plus, Search, Trash2, Edit, X, Loader2, Filter, Eye, Sparkles, Save, UserCheck, Check, UsersRound, ChevronRight, UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface GroupRow {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  contactCount: number;
  isDynamic: boolean;
  filterConditions?: FilterConditions | null;
  createdAt: string;
}

type Operator =
  | 'equals' | 'not_equals' | 'in' | 'not_in'
  | 'contains' | 'starts_with' | 'is_set' | 'is_empty';

interface Rule {
  field: string;
  op: Operator;
  value?: string | number | (string | number)[];
}
interface FilterConditions {
  logic: 'AND' | 'OR';
  rules: Rule[];
}

// Field labels — friendly names for the picker. Falls back to the raw field
// for anything not in this map (so adding a new whitelisted field on the
// backend doesn't require a frontend change to be usable).
const FIELD_LABELS: Record<string, string> = {
  department: 'Department',
  subDepartment: 'Sub-Department',
  designation: 'Designation',
  costCenterCode: 'Cost Center Code',
  costCenterName: 'Cost Center / Organization',
  region: 'Region',
  segmentName: 'Segment',
  subSegmentName: 'Sub-Segment',
  employmentCategory: 'Employment Category',
  employeeStatus: 'Employee Status',
  reportingManagerName: 'Reporting Manager',
  reportingManagerCode: 'Reporting Manager Code',
  employeeId: 'Employee ID',
  status: 'Contact Status',
  name: 'Name',
  company: 'Company',
  jobTitle: 'Job Title',
  city: 'City',
  country: 'Country',
  skillType: 'Skill Type',
  hiringType: 'Hiring Type',
};

const OPERATOR_OPTIONS: { value: Operator; label: string; takesValue: 'single' | 'multi' | 'none' }[] = [
  { value: 'equals',      label: 'is',                takesValue: 'single' },
  { value: 'not_equals',  label: 'is not',            takesValue: 'single' },
  { value: 'in',          label: 'is any of',         takesValue: 'multi'  },
  { value: 'not_in',      label: 'is none of',        takesValue: 'multi'  },
  { value: 'contains',    label: 'contains',          takesValue: 'single' },
  { value: 'starts_with', label: 'starts with',       takesValue: 'single' },
  { value: 'is_set',      label: 'is set',            takesValue: 'none'   },
  { value: 'is_empty',    label: 'is empty',          takesValue: 'none'   },
];

export function ContactGroups() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<GroupRow | null>(null);
  const [assigning, setAssigning] = useState<GroupRow | null>(null);

  // Row-selection state — checkboxes in the group list.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // "Update Assigned" mode — pre-checks groups for a chosen operator and
  // turns Save into a replace-this-operator's-set operation.
  const [showOperatorPicker, setShowOperatorPicker] = useState(false);
  const [updatingOperator, setUpdatingOperator] = useState<{
    id: number;
    name: string;
    email: string;
  } | null>(null);

  const { hasPermission } = useAuth();
  const canAssign = hasPermission('canManageUsers');

  const toggleRowSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitUpdateMode = () => {
    setUpdatingOperator(null);
    setSelectedIds(new Set());
  };

  // When admin picks an operator in the "Update Assigned" picker, fetch
  // that operator's current groups and pre-check the rows.
  const enterUpdateMode = async (op: { id: number; name: string; email: string }) => {
    try {
      const r = await apiService.contactGroups.listUserAssignedGroups(op.id);
      if (r?.success) {
        const ids = new Set<number>(
          (r.data || []).map((row: any) => Number(row.groupId)).filter(Number.isFinite)
        );
        setSelectedIds(ids);
        setUpdatingOperator(op);
        setShowOperatorPicker(false);
      }
    } catch (e: any) {
      toast.error('Failed to load operator\'s groups', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    }
  };

  const handleApplyUpdate = async () => {
    if (!updatingOperator) return;
    try {
      const r = await apiService.contactGroups.setUserAssignedGroups(
        updatingOperator.id,
        Array.from(selectedIds)
      );
      if (r?.success) {
        const d = r.data || {};
        toast.success(
          `Updated ${updatingOperator.name} — ${d.added ?? 0} added, ${d.removed ?? 0} removed`
        );
        exitUpdateMode();
      }
    } catch (e: any) {
      toast.error('Update failed', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    }
  };


  const fetchGroups = async () => {
    setLoading(true);
    try {
      const r = await apiService.contactGroups.list({ search, limit: 100 });
      if (r?.success) {
        setGroups(r.data?.groups || r.data || []);
      }
    } catch (e: any) {
      toast.error('Failed to load groups', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when search changes, debounced.
  useEffect(() => {
    const t = setTimeout(fetchGroups, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async (g: GroupRow) => {
    if (!window.confirm(`Delete group "${g.name}"? This can't be undone.`)) return;
    try {
      await apiService.contactGroups.delete(String(g.id));
      toast.success(`Deleted ${g.name}`);
      fetchGroups();
    } catch (e: any) {
      toast.error('Delete failed', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white">Contact Groups</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bundle contacts together — either by hand-picking, or by a filter that auto-updates
            as new contacts are added.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canAssign && groups.length > 0 && !updatingOperator && (
            <button
              onClick={() => setShowOperatorPicker(true)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg flex items-center gap-2"
              title="Pick an operator; their assigned groups will pre-check so you can adjust and save"
            >
              <UsersRound className="w-4 h-4" />
              Bulk Assign
            </button>
          )}
          <button
            onClick={() => { setEditing(null); setShowEditor(true); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 shadow"
            disabled={!!updatingOperator}
          >
            <Plus className="w-4 h-4" />
            New Group
          </button>
        </div>
      </div>

      {/* Update-assigned banner */}
      {updatingOperator && (
        <div className="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <UserCheck className="w-5 h-5 text-blue-700 dark:text-blue-300 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-blue-900 dark:text-blue-100 truncate">
                Updating groups for <strong>{updatingOperator.name}</strong>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 truncate">
                Their current groups are pre-checked. Tick or untick rows, then apply.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-blue-700 dark:text-blue-300">
              {selectedIds.size} selected
            </span>
            <button
              onClick={exitUpdateMode}
              className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyUpdate}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Apply changes
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Group list */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : groups.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              No contact groups yet. Click <strong>New Group</strong> to bundle contacts by
              department, designation, region, or hand-pick.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  {updatingOperator && (
                    <th className="px-4 py-3 w-10">
                      {/* Select-all checkbox — toggles every visible row. */}
                      <button
                        onClick={() => {
                          const allIds = groups.map((g) => g.id);
                          const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
                          setSelectedIds(allSelected ? new Set() : new Set(allIds));
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          groups.length > 0 && groups.every((g) => selectedIds.has(g.id))
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
                        }`}
                        aria-label="Select all"
                      >
                        {groups.length > 0 && groups.every((g) => selectedIds.has(g.id)) && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Members</th>
                  <th className="text-left px-4 py-3">Criteria / Description</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const isSelected = selectedIds.has(g.id);
                  return (
                  <tr
                    key={g.id}
                    className={`border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 ${
                      isSelected ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    {updatingOperator && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRowSelected(g.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
                          }`}
                          aria-label={isSelected ? 'Deselect group' : 'Select group'}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {g.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        g.isDynamic
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}>
                        {g.isDynamic ? 'Dynamic' : 'Manual'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 tabular-nums">
                      {g.contactCount}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-md">
                      <div className="truncate">
                        {g.isDynamic && g.filterConditions
                          ? summarizeFilter(g.filterConditions)
                          : (g.description || '—')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canAssign && (
                        <button
                          onClick={() => setAssigning(g)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded mr-1"
                          title="Assign to operators"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { setEditing(g); setShowEditor(true); }}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded mr-1"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(g)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEditor && (
        <GroupEditor
          group={editing}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); fetchGroups(); }}
        />
      )}

      {assigning && (
        <AssignUsersModal
          group={assigning}
          onClose={() => setAssigning(null)}
        />
      )}

      {/* Operator picker for "Bulk Assign" — small modal listing operators.
          Picking one enters update-mode: checkboxes appear pre-checked with
          that operator's current groups, then admin ticks/unticks and saves. */}
      {showOperatorPicker && (
        <OperatorPickerModal
          title="Bulk assign groups"
          subtitle="Pick the operator whose group assignments you want to edit. Their current groups will pre-check."
          onClose={() => setShowOperatorPicker(false)}
          onSelect={(op) => enterUpdateMode(op)}
          buttonLabel="Continue"
        />
      )}
    </div>
  );
}

/* ------------------------- Assign-Users Modal ---------------------------- */

interface AssignedUserRow {
  userId: number;
  user: {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
    role: string;
    status: string;
  } | null;
}

interface OrgUser {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  status: string;
}

function AssignUsersModal({
  group,
  onClose,
}: {
  group: GroupRow;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        // Pull operators + viewers — these are the roles that need explicit
        // assignment. Admins/managers see everything regardless.
        const [usersR, assignedR] = await Promise.all([
          apiService.users.list({ limit: 500 }),
          apiService.contactGroups.listAssignedUsers(String(group.id)),
        ]);
        const users: OrgUser[] = (usersR?.data || []).filter(
          (u: any) => u.role === 'operator' || u.role === 'viewer'
        );
        setAllUsers(users);
        const initial = new Set<number>(
          (assignedR?.data || []).map((r: AssignedUserRow) => r.userId)
        );
        setSelectedIds(initial);
      } catch (e: any) {
        toast.error('Failed to load assignment data', {
          description: e?.response?.data?.error?.message || e?.message,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [group.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((u) => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      return name.includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [allUsers, search]);

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.contactGroups.setAssignedUsers(
        String(group.id),
        Array.from(selectedIds)
      );
      toast.success(`Assignments updated for "${group.name}"`);
      onClose();
    } catch (e: any) {
      toast.error('Save failed', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-base text-gray-900 dark:text-white">Assign operators</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Pick the operators who should see "{group.name}" in their menu.
              Admins and managers always see every group.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">
              {allUsers.length === 0
                ? 'No operators or viewers in this organization yet. Create one in User Management first.'
                : 'No matches.'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((u) => {
                const checked = selectedIds.has(u.id);
                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
                return (
                  <li key={u.id}>
                    <button
                      onClick={() => toggle(u.id)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          checked
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {checked && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">{fullName}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize flex-shrink-0">
                        {u.role}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {selectedIds.size} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save assignments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Editor ----------------------------------- */

function GroupEditor({
  group,
  onClose,
  onSaved,
}: {
  group: GroupRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!group;
  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [isDynamic, setIsDynamic] = useState<boolean>(group?.isDynamic || false);
  const [filterConditions, setFilterConditions] = useState<FilterConditions>(
    group?.filterConditions || { logic: 'AND', rules: [{ field: 'department', op: 'equals', value: '' }] }
  );
  const [saving, setSaving] = useState(false);

  // Allowed fields from backend
  const [allowedFields, setAllowedFields] = useState<string[]>([]);
  // Per-field distinct values cache
  const [distinctCache, setDistinctCache] = useState<Record<string, string[]>>({});
  // Preview state
  const [preview, setPreview] = useState<{ count: number; sample: any[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    apiService.contactGroups.filterFields()
      .then((r: any) => { if (r?.success) setAllowedFields(r.data || []); })
      .catch(() => {});
  }, []);

  // Fetch distinct values for whichever fields the current rules use, lazily.
  useEffect(() => {
    const fieldsToLoad = filterConditions.rules
      .map((r) => r.field)
      .filter((f) => f && !(f in distinctCache));
    if (fieldsToLoad.length === 0) return;
    fieldsToLoad.forEach((f) => {
      apiService.contactGroups.distinctValues(f)
        .then((r: any) => {
          if (r?.success) {
            setDistinctCache((prev) => ({ ...prev, [f]: r.data || [] }));
          }
        })
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterConditions]);

  const fieldLabel = (f: string) => FIELD_LABELS[f] || f;

  // Debounced preview when criteria changes
  useEffect(() => {
    if (!isDynamic) { setPreview(null); return; }
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        const r = await apiService.contactGroups.preview(filterConditions, 8);
        if (r?.success) setPreview(r.data);
      } catch (e: any) {
        // Don't toast — criteria might be mid-edit. Just clear.
        setPreview({ count: 0, sample: [] });
      } finally {
        setPreviewing(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [filterConditions, isDynamic]);

  const updateRule = (idx: number, patch: Partial<Rule>) => {
    setFilterConditions((prev) => ({
      ...prev,
      rules: prev.rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
  };

  const addRule = () => {
    setFilterConditions((prev) => ({
      ...prev,
      rules: [...prev.rules, { field: allowedFields[0] || 'department', op: 'equals', value: '' }],
    }));
  };

  const removeRule = (idx: number) => {
    setFilterConditions((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Group name is required');
      return;
    }
    if (isDynamic && filterConditions.rules.length === 0) {
      toast.error('Dynamic group needs at least one rule');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        isDynamic,
        filterConditions: isDynamic ? filterConditions : null,
      };
      const r = isEdit
        ? await apiService.contactGroups.update(String(group!.id), payload)
        : await apiService.contactGroups.create(payload);
      if (r?.success) {
        toast.success(isEdit ? 'Group updated' : 'Group created');
        onSaved();
      } else {
        toast.error('Save failed', { description: r?.error?.message });
      }
    } catch (e: any) {
      toast.error('Save failed', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg text-gray-900 dark:text-white">
            {isEdit ? 'Edit Group' : 'New Group'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsDynamic(false)}
              className={`flex-1 px-3 py-3 rounded-lg border text-left transition-colors ${
                !isDynamic
                  ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white mb-1">
                <Users className="w-4 h-4" />
                Manual selection
              </div>
              <p className="text-xs text-gray-500">
                Hand-pick contacts. Membership stays fixed until you edit.
              </p>
            </button>
            <button
              onClick={() => setIsDynamic(true)}
              className={`flex-1 px-3 py-3 rounded-lg border text-left transition-colors ${
                isDynamic
                  ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white mb-1">
                <Sparkles className="w-4 h-4" />
                Dynamic (rule-based)
              </div>
              <p className="text-xs text-gray-500">
                Define filters (department, region, designation…). Auto-updates as new
                contacts arrive.
              </p>
            </button>
          </div>

          {/* Basic fields */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Karnataka Operations"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional notes for your team"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Dynamic criteria builder */}
          {isDynamic && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Criteria
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Match</span>
                  <select
                    value={filterConditions.logic}
                    onChange={(e) =>
                      setFilterConditions((p) => ({ ...p, logic: e.target.value as 'AND' | 'OR' }))
                    }
                    className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                  >
                    <option value="AND">ALL rules (AND)</option>
                    <option value="OR">ANY rule (OR)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {filterConditions.rules.map((rule, idx) => {
                  const operatorDef = OPERATOR_OPTIONS.find((o) => o.value === rule.op);
                  const distincts = distinctCache[rule.field] || [];
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-start p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      {/* Field */}
                      <select
                        value={rule.field}
                        onChange={(e) => updateRule(idx, { field: e.target.value, value: '' })}
                        className="col-span-4 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-gray-900 dark:text-white"
                      >
                        {allowedFields.map((f) => (
                          <option key={f} value={f}>{fieldLabel(f)}</option>
                        ))}
                      </select>

                      {/* Operator */}
                      <select
                        value={rule.op}
                        onChange={(e) => updateRule(idx, { op: e.target.value as Operator, value: '' })}
                        className="col-span-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-gray-900 dark:text-white"
                      >
                        {OPERATOR_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>

                      {/* Value */}
                      <div className="col-span-4">
                        {operatorDef?.takesValue === 'none' ? (
                          <div className="text-xs text-gray-400 italic px-2 py-1.5">no value</div>
                        ) : operatorDef?.takesValue === 'multi' ? (
                          <MultiValuePicker
                            options={distincts}
                            value={Array.isArray(rule.value) ? (rule.value as string[]) : []}
                            onChange={(arr) => updateRule(idx, { value: arr })}
                          />
                        ) : distincts.length > 0 && operatorDef?.value === 'equals' ? (
                          <select
                            value={String(rule.value ?? '')}
                            onChange={(e) => updateRule(idx, { value: e.target.value })}
                            className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-gray-900 dark:text-white"
                          >
                            <option value="">— select —</option>
                            {distincts.map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={String(rule.value ?? '')}
                            onChange={(e) => updateRule(idx, { value: e.target.value })}
                            placeholder="value"
                            className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-gray-900 dark:text-white"
                          />
                        )}
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeRule(idx)}
                        disabled={filterConditions.rules.length === 1}
                        className="col-span-1 p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove rule"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={addRule}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add rule
              </button>

              {/* Preview */}
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 mb-2">
                  <Eye className="w-4 h-4" />
                  <span className="font-medium">Preview:</span>
                  {previewing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : preview ? (
                    <span>{preview.count} contact{preview.count === 1 ? '' : 's'} match</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                {preview && preview.sample.length > 0 && (
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 max-h-32 overflow-y-auto">
                    {preview.sample.map((c: any) => (
                      <li key={c.id} className="truncate">
                        {c.name}
                        {c.designation && <span className="text-gray-400"> · {c.designation}</span>}
                        {c.department && <span className="text-gray-400"> · {c.department}</span>}
                      </li>
                    ))}
                    {preview.count > preview.sample.length && (
                      <li className="text-gray-400">+ {preview.count - preview.sample.length} more…</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Manual mode hint */}
          {!isDynamic && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs text-gray-600 dark:text-gray-400">
              After saving, open the group from the list to add specific contacts.
              {' '}You can also bulk-add from the Contacts page.
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Update Group' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Multi-value picker (checkbox dropdown for `in` / `not_in`) -------- */

function MultiValuePicker({
  options, value, onChange,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-gray-900 dark:text-white truncate"
      >
        {value.length === 0 ? <span className="text-gray-400">— select values —</span> : value.join(', ')}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1">
            {options.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-gray-400">No values available</div>
            ) : (
              options.map((v) => (
                <label
                  key={v}
                  className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(v)}
                    onChange={() => toggle(v)}
                    className="w-3.5 h-3.5"
                  />
                  <span className="truncate">{v}</span>
                </label>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---- helpers ----------------------------------------------------------- */

function summarizeFilter(c: FilterConditions): string {
  if (!c.rules || c.rules.length === 0) return '—';
  const parts = c.rules.map((r) => {
    const label = FIELD_LABELS[r.field] || r.field;
    if (r.op === 'is_set') return `${label} is set`;
    if (r.op === 'is_empty') return `${label} is empty`;
    const opLabel = OPERATOR_OPTIONS.find((o) => o.value === r.op)?.label || r.op;
    const val = Array.isArray(r.value) ? r.value.join('/') : (r.value ?? '');
    return `${label} ${opLabel} "${val}"`;
  });
  return parts.join(c.logic === 'OR' ? ' OR ' : ' AND ');
}

/* --------------------- Operator Picker Modal ----------------------------- */

/**
 * Small modal that lists operators/viewers for selection. Two modes:
 *   • single — clicking a row immediately calls onSelect(operator)
 *   • multi  — checkboxes; "Submit" calls onSubmitMulti(ids)
 *
 * Powers both the "Update Assigned" entry point (single) and the sticky-bar
 * "Assign selected groups to operator(s)" action (multi).
 */
function OperatorPickerModal({
  title,
  subtitle,
  onClose,
  onSelect,
  onSubmitMulti,
  multi = false,
  buttonLabel = 'Apply',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSelect?: (op: { id: number; name: string; email: string }) => void;
  onSubmitMulti?: (ids: number[]) => void;
  multi?: boolean;
  buttonLabel?: string;
}) {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    apiService.users
      .list({ limit: 500 })
      .then((r: any) => {
        const list: OrgUser[] = (r?.data || []).filter(
          (u: any) => u.role === 'operator' || u.role === 'viewer'
        );
        setUsers(list);
      })
      .catch((e: any) =>
        toast.error('Failed to load users', {
          description: e?.response?.data?.error?.message || e?.message,
        })
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      return name.includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, query]);

  const fullNameOf = (u: OrgUser) =>
    `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRowClick = (u: OrgUser) => {
    if (multi) {
      toggle(u.id);
    } else if (onSelect) {
      onSelect({ id: u.id, name: fullNameOf(u), email: u.email });
    }
  };

  const initialOf = (u: OrgUser) =>
    (u.firstName?.[0] || u.email[0] || '?').toUpperCase();

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl py-4 w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — clean, no gradient. Title + subtitle on the left, close on the right. */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <UsersRound className="w-4 h-4 text-gray-700 dark:text-gray-300 flex-shrink-0" />
              <h3 className="text-base text-gray-900 dark:text-white leading-none">
                {title}
              </h3>
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mt-1 -mr-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 placeholder:text-gray-400 text-gray-900 dark:text-white"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {!loading && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 px-0.5">
              {filtered.length} of {users.length} operator{users.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <p className="text-xs text-gray-500">Loading operators…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center text-center py-16 px-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <UserX className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-sm text-gray-900 dark:text-white mb-1">
                {users.length === 0 ? 'No operators yet' : 'No matches'}
              </p>
              <p className="text-xs text-gray-500 max-w-[280px] leading-relaxed">
                {users.length === 0
                  ? 'Create an operator in User Management to assign contact groups.'
                  : `Nothing matches "${query}". Try a different search.`}
              </p>
            </div>
          ) : (
            <ul className="py-2">
              {filtered.map((u) => {
                const isChecked = selectedIds.has(u.id);
                const inactive = u.status && u.status !== 'active';
                return (
                  <li key={u.id}>
                    <button
                      onClick={() => handleRowClick(u)}
                      className={`group w-full flex items-center gap-3 px-6 py-3 text-left transition-colors border-l-2 ${
                        multi && isChecked
                          ? 'bg-gray-50 dark:bg-gray-800/60 border-l-gray-900 dark:border-l-white'
                          : 'border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      {multi && (
                        <div
                          className={`w-[18px] h-[18px] rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-gray-900 border-gray-900 dark:bg-white dark:border-white'
                              : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-500'
                          }`}
                        >
                          {isChecked && (
                            <Check
                              className="w-3 h-3 text-white dark:text-gray-900"
                              strokeWidth={3}
                            />
                          )}
                        </div>
                      )}

                      {/* Avatar — flat circle with initial. Stays readable in monochrome. */}
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 text-large p-2 font-medium">
                          {initialOf(u)}
                        </div>
                        {inactive && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-white dark:border-gray-900"
                            title={`Status: ${u.status}`}
                          />
                        )}
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate leading-tight">
                          {fullNameOf(u)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5">
                          {u.email}
                        </p>
                      </div>

                      {/* Role pill — minimal outlined style */}
                      <span className="text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">
                        {u.role}
                      </span>

                      {/* Single-select chevron — fades in on hover */}
                      {!multi && (
                        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -ml-1" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {multi ? (
          <div className="px-6 py-3.5 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="text-gray-900 dark:text-white">{selectedIds.size}</span> selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onSubmitMulti && onSubmitMulti(Array.from(selectedIds))}
                disabled={selectedIds.size === 0}
                className="px-4 py-1.5 text-sm bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {buttonLabel}
              </button>
            </div>
          </div>
        ) : (
          !loading && filtered.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Click any operator to load their assigned groups.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
