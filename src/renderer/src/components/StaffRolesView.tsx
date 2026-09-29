import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Users, 
  Plus, 
  Key, 
  Lock, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  X, 
  Search,
  CheckSquare,
  Square,
  BadgeCheck
} from 'lucide-react';

interface StaffRolesViewProps {
  token: string;
}

const AVAILABLE_PERMISSIONS = [
  { key: 'pos.checkout', label: 'Point of Sale & Billing (F1)', group: 'Sales & POS' },
  { key: 'pos.discount', label: 'Apply Custom Discounts', group: 'Sales & POS' },
  { key: 'pos.void', label: 'Void Items & Cancel Invoices', group: 'Sales & POS' },
  { key: 'inventory.view', label: 'View Stock & Low-Stock Alerts', group: 'Inventory' },
  { key: 'inventory.adjust', label: 'Adjust Inventory & Count Stock', group: 'Inventory' },
  { key: 'procurement.manage_suppliers', label: 'Add & Manage Suppliers', group: 'Purchases' },
  { key: 'procurement.manage_po', label: 'Inward Intake & POs', group: 'Purchases' },
  { key: 'repairs.manage', label: 'Service & Repair Tickets', group: 'Workflows' },
  { key: 'tradein.manage', label: 'Trade-In / Buyback Inspections', group: 'Workflows' },
  { key: 'shifts.open_close', label: 'Open & Close Shifts / Cash Drawer', group: 'Cash & Finance' },
  { key: 'expenses.manage', label: 'Record Drawer Operating Expenses', group: 'Cash & Finance' },
  { key: 'customers.manage', label: 'Customer Directory & Credit Ledgers', group: 'Customers' },
  { key: 'reports.view', label: 'P&L Statements & Audit Reports', group: 'Analytics' },
  { key: 'settings.manage', label: 'System Settings & Document Templates', group: 'Administration' },
  { key: 'users.manage', label: 'Staff Accounts & Role Assignment', group: 'Administration' },
];

export const StaffRolesView: React.FC<StaffRolesViewProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'roles'>('staff');
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Add User Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState('cashier');

  // Add/Edit Role Modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const api = (window as any).apexApi;
      if (api?.auth?.getUsers) {
        const u = await api.auth.getUsers();
        setUsers(u || []);
      }
      if (api?.auth?.getRoles) {
        const r = await api.auth.getRoles();
        setRoles(r || []);
      }
    } catch (e) {
      console.error('Failed to load users & roles:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newUsername.trim() || !newPassword.trim()) {
      alert('Full Name, Username, and Password are required.');
      return;
    }

    try {
      const api = (window as any).apexApi;
      await api.auth.createUser({
        fullName: newFullName.trim(),
        username: newUsername.trim(),
        password: newPassword,
        pin: newPin.trim() || undefined,
        role: newRole,
      }, token);

      showToast(`Staff account '${newUsername}' created successfully!`);
      setIsAddUserOpen(false);
      setNewFullName('');
      setNewUsername('');
      setNewPassword('');
      setNewPin('');
      loadData();
    } catch (err: any) {
      alert(`Failed to create staff member: ${err.message || err}`);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to deactivate staff account '${username}'?`)) return;
    try {
      const api = (window as any).apexApi;
      await api.auth.deleteUser(userId, token);
      showToast(`User '${username}' deactivated.`);
      loadData();
    } catch (err: any) {
      alert(`Cannot delete user: ${err.message || err}`);
    }
  };

  const handleOpenCreateRole = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions(['pos.checkout', 'customers.manage']);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: any) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setSelectedPermissions(role.permissions || []);
    setIsRoleModalOpen(true);
  };

  const togglePermission = (key: string) => {
    setSelectedPermissions(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      alert('Role Name is required.');
      return;
    }

    try {
      const api = (window as any).apexApi;
      if (editingRoleId) {
        await api.auth.updateRole(editingRoleId, roleName.trim(), roleDescription.trim(), selectedPermissions, token);
        showToast(`Role '${roleName}' updated successfully!`);
      } else {
        await api.auth.createRole(roleName.trim(), roleDescription.trim(), selectedPermissions, token);
        showToast(`Role '${roleName}' created successfully!`);
      }
      setIsRoleModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Failed to save role: ${err.message || err}`);
    }
  };

  const handleDeleteRole = async (roleId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete role '${name}'?`)) return;
    try {
      const api = (window as any).apexApi;
      await api.auth.deleteRole(roleId, token);
      showToast(`Role '${name}' removed.`);
      loadData();
    } catch (err: any) {
      alert(`Cannot delete role: ${err.message || err}`);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7fb] dark:bg-slate-900 select-none overflow-y-auto p-8 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-8 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#1a4cd2] dark:text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Staff Accounts & Security Roles
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure staff members, assigned roles, quick PIN lockouts, and granular access permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === 'staff' ? (
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#1a4cd2] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Staff Member</span>
            </button>
          ) : (
            <button
              onClick={handleOpenCreateRole}
              className="px-5 py-2.5 rounded-xl bg-[#1a4cd2] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Custom Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation tabs & Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs">
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-white dark:bg-slate-600 text-[#1a4cd2] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Staff Accounts ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-white dark:bg-slate-600 text-[#1a4cd2] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Access Roles & Permissions ({roles.length})
          </button>
        </div>

        {activeTab === 'staff' && (
          <div className="relative max-w-sm w-full">
            <input
              type="text"
              placeholder="Search staff by name or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-[#1a4cd2] text-slate-900 dark:text-white"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        )}
      </div>

      {/* TAB 1: STAFF ACCOUNTS */}
      {activeTab === 'staff' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  <th className="pb-3.5">Staff Member</th>
                  <th className="pb-3.5">Username</th>
                  <th className="pb-3.5">Assigned Role</th>
                  <th className="pb-3.5 text-center">Quick PIN</th>
                  <th className="pb-3.5 text-center">Status</th>
                  <th className="pb-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                    <td className="py-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#1a4cd2] dark:text-blue-300 font-black flex items-center justify-center text-xs">
                        {u.fullName?.charAt(0) || u.username?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div>{u.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">Registered Staff</div>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-slate-600 dark:text-slate-300">
                      @{u.username}
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      {u.pinHash ? (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Configured</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Not Set</span>
                      )}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.isActive !== false ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {u.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      {u.role !== 'owner' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Deactivate Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((r) => {
            const isSystemRole = r.isSystemRole;
            const perms: string[] = r.permissions || [];
            const isFullAccess = perms.includes('*');

            return (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {isSystemRole ? 'SYSTEM ROLE' : 'CUSTOM ROLE'}
                    </span>
                    {!isSystemRole && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditRole(r)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(r.id, r.name)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-black text-base text-slate-900 dark:text-white capitalize">
                    {r.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                    {r.description || 'Pre-configured system role.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Granted Privileges:
                    </div>
                    {isFullAccess ? (
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <BadgeCheck className="w-4 h-4" />
                        <span>Full Operational Master Authority (*)</span>
                      </div>
                    ) : perms.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">No permissions assigned</div>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                        {perms.map(p => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300"
                          >
                            {AVAILABLE_PERMISSIONS.find(ap => ap.key === p)?.label || p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 text-[11px] font-medium text-slate-400 flex items-center justify-between">
                  <span>Authorized Capabilities:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {isFullAccess ? 'All' : perms.length}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Staff Member */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Add Staff Member
              </h3>
              <button 
                onClick={() => setIsAddUserOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kasun Fernando"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a4cd2]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Login Username *
                </label>
                <input
                  type="text"
                  placeholder="e.g. kasun"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#1a4cd2]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a4cd2]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    4-Digit PIN (Quick Unlock)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="e.g. 1234"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#1a4cd2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Operational Role *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#1a4cd2]"
                >
                  <option value="manager">Manager (High Permissions)</option>
                  <option value="cashier">Cashier (POS & Billing)</option>
                  <option value="technician">Technician (Repairs & Hardware)</option>
                  <option value="inventory_clerk">Inventory Clerk (Stock & POs)</option>
                  {roles.filter(r => !r.isSystemRole).map(r => (
                    <option key={r.id} value={r.name}>{r.name} (Custom)</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black rounded-xl bg-[#1a4cd2] hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create or Edit Role with Granular Permissions */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editingRoleId ? 'Edit Role Privileges' : 'Create Custom Access Role'}
                </h3>
                <p className="text-xs text-slate-400">
                  Select exact granular capabilities allowed for this staff group.
                </p>
              </div>
              <button 
                onClick={() => setIsRoleModalOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Role Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Supervisor"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a4cd2]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Authorized to oversee cashier drawer and approve custom discounts"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a4cd2]"
                />
              </div>

              {/* Granular Permissions Checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Granular Operational Privileges ({selectedPermissions.length} selected)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.key);
                    return (
                      <div
                        key={perm.key}
                        onClick={() => togglePermission(perm.key)}
                        className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-colors ${
                          isChecked 
                            ? 'bg-blue-50/80 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-600/40 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 text-[#1a4cd2] dark:text-blue-400">
                          {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">{perm.label}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{perm.group}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black rounded-xl bg-[#1a4cd2] hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer"
                >
                  Save Access Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
