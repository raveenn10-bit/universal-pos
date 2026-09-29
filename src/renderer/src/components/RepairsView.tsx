import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  User, 
  X, 
  MessageSquare, 
  Printer, 
  Tag, 
  Filter 
} from 'lucide-react';
import { RepairTicket } from '../../../shared/types';

interface RepairsViewProps {
  onNotify?: (type: string, msg: string) => void;
}

export const RepairsView: React.FC<RepairsViewProps> = ({ onNotify }) => {
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // New ticket modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+94 ');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [imeiOrSerial, setImeiOrSerial] = useState('');
  const [passcode, setPasscode] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [physicalCondition, setPhysicalCondition] = useState('Minor scuffs, screen intact');
  const [estimatedCost, setEstimatedCost] = useState<number>(15000);
  const [advancePaid, setAdvancePaid] = useState<number>(5000);
  const [assignedTechnician, setAssignedTechnician] = useState('Nuwan Pradeep');

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await (window as any).apexApi.repairs.list({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setTickets(data || []);
    } catch (err) {
      console.error('Failed to load repair tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deviceModel.trim() || !faultDescription.trim()) return;

    try {
      const token = localStorage.getItem('apex_token') || '';
      await (window as any).apexApi.repairs.create({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        deviceModel: deviceModel.trim(),
        imeiOrSerial: imeiOrSerial.trim() || undefined,
        passcode: passcode.trim() || undefined,
        faultDescription: faultDescription.trim(),
        physicalCondition: physicalCondition.trim(),
        estimatedCostMinor: Math.round(Number(estimatedCost) * 100),
        advancePaidMinor: Math.round(Number(advancePaid) * 100),
        assignedTechnician: assignedTechnician.trim() || undefined,
      }, token);

      setIsModalOpen(false);
      resetForm();
      loadTickets();
      if (onNotify) onNotify('success', 'Repair ticket registered successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to create repair ticket');
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('+94 ');
    setCustomerEmail('');
    setDeviceModel('');
    setImeiOrSerial('');
    setPasscode('');
    setFaultDescription('');
    setEstimatedCost(15000);
    setAdvancePaid(5000);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('apex_token') || '';
      await (window as any).apexApi.repairs.updateStatus(ticketId, newStatus, undefined, token);
      loadTickets();
      if (onNotify) onNotify('success', `Ticket updated to ${newStatus}`);
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const sendWhatsAppUpdate = (ticket: RepairTicket) => {
    const rawDigits = ticket.customerPhone.replace(/[^0-9]/g, '');
    let cleanPhone = rawDigits;
    if (rawDigits.startsWith('0') && rawDigits.length === 10) cleanPhone = '94' + rawDigits.substring(1);
    else if (rawDigits.length === 9) cleanPhone = '94' + rawDigits;

    const balanceLkr = ((ticket.estimatedCostMinor - ticket.advancePaidMinor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const msg = `Hello *${ticket.customerName}*,\n\nUpdate on your repair ticket *#${ticket.ticketNumber}* (${ticket.deviceModel}) at *Harsh Apex Tech Lab*:\n\n📋 *Status:* ${ticket.status}\n🔧 *Reported Fault:* ${ticket.faultDescription}\n💰 *Balance Payable on Collection:* LKR ${balanceLkr}\n\nThank you for choosing our technical services!`;

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const printJobSheet = (ticket: RepairTicket) => {
    const balance = ((ticket.estimatedCostMinor - ticket.advancePaidMinor) / 100).toFixed(2);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Repair Job Sheet - ${ticket.ticketNumber}</title>
          <style>
            body { font-family: monospace; font-size: 12px; width: 72mm; margin: 0 auto; padding: 10px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 14px;">HARSH APEX TECH LAB</div>
          <div class="center">REPAIR INTAKE & JOB SHEET</div>
          <div class="divider"></div>
          <div class="row"><span>Ticket #:</span><span class="bold">${ticket.ticketNumber}</span></div>
          <div class="row"><span>Date:</span><span>${new Date(ticket.createdAt).toLocaleDateString()}</span></div>
          <div class="row"><span>Customer:</span><span class="bold">${ticket.customerName}</span></div>
          <div class="row"><span>Phone:</span><span>${ticket.customerPhone}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Device:</span><span class="bold">${ticket.deviceModel}</span></div>
          ${ticket.imeiOrSerial ? `<div class="row"><span>IMEI/Serial:</span><span>${ticket.imeiOrSerial}</span></div>` : ''}
          ${ticket.passcode ? `<div class="row"><span>Passcode:</span><span>${ticket.passcode}</span></div>` : ''}
          <div class="row"><span>Fault:</span><span>${ticket.faultDescription}</span></div>
          <div class="row"><span>Technician:</span><span>${ticket.assignedTechnician || 'Staff'}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Est. Total:</span><span>LKR ${(ticket.estimatedCostMinor / 100).toFixed(2)}</span></div>
          <div class="row"><span>Advance Paid:</span><span>LKR ${(ticket.advancePaidMinor / 100).toFixed(2)}</span></div>
          <div class="row bold"><span>Balance Due:</span><span>LKR ${balance}</span></div>
          <div class="divider"></div>
          <div class="center" style="font-size: 10px; margin-top: 12px;">
            Please present this ticket upon device collection.<br/>
            Standard bench warranty applies to replaced components.
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  const statusCols: { key: string; label: string; color: string }[] = [
    { key: 'Received', label: 'Received', color: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' },
    { key: 'Diagnostics', label: 'Diagnostics', color: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' },
    { key: 'Waiting for Parts', label: 'Waiting Parts', color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' },
    { key: 'Repairing', label: 'Repairing', color: 'border-purple-500 bg-purple-50 dark:bg-purple-950/30' },
    { key: 'Ready for Pickup', label: 'Ready for Pickup', color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
    { key: 'Delivered', label: 'Delivered', color: 'border-slate-400 bg-slate-50 dark:bg-slate-800/30' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
            <Wrench size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              Repairs & Technical Service Center
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage hardware repair tickets, technician assignment, WhatsApp updates & job sheets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700/60 p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'kanban' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Table
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md transition-all"
          >
            <Plus size={16} />
            <span>New Repair Ticket</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets, phone, IMEI..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Total: {tickets.length} tickets</span>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statusCols.map((col) => {
            const colTickets = tickets.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="flex flex-col rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 p-3 min-h-[500px] border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{col.label}</span>
                  <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {colTickets.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-2 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black font-mono text-indigo-600 dark:text-indigo-400">
                          {t.ticketNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                          {t.deviceModel}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {t.faultDescription}
                        </p>
                      </div>

                      <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {t.customerName} • {t.customerPhone}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                        <span className="font-bold text-slate-900 dark:text-white">
                          LKR {(t.estimatedCostMinor / 100).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => sendWhatsAppUpdate(t)}
                            title="WhatsApp update"
                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            <MessageSquare size={13} />
                          </button>
                          <button
                            onClick={() => printJobSheet(t)}
                            title="Print 80mm Job Sheet"
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Printer size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className="w-full mt-1.5 py-1 px-2 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none"
                      >
                        {statusCols.map((s) => (
                          <option key={s.key} value={s.key}>
                            → {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">Ticket #</th>
                <th className="p-3.5">Device & Model</th>
                <th className="p-3.5">Customer & Phone</th>
                <th className="p-3.5">Fault Description</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Est. Cost</th>
                <th className="p-3.5">Advance</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                  <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{t.ticketNumber}</td>
                  <td className="p-3.5 font-bold text-slate-800 dark:text-white">{t.deviceModel}</td>
                  <td className="p-3.5 font-medium">{t.customerName} ({t.customerPhone})</td>
                  <td className="p-3.5 text-slate-500 dark:text-slate-400 max-w-xs truncate">{t.faultDescription}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold">LKR {(t.estimatedCostMinor / 100).toLocaleString()}</td>
                  <td className="p-3.5">LKR {(t.advancePaidMinor / 100).toLocaleString()}</td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => sendWhatsAppUpdate(t)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50">
                        <MessageSquare size={14} />
                      </button>
                      <button onClick={() => printJobSheet(t)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench size={18} />
                <h3 className="font-bold text-base">New Repair & Service Ticket</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-white/20">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ruwan Silva"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Customer Phone *</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="077 123 4567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Device Model *</label>
                  <input
                    type="text"
                    required
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    placeholder="e.g. iPhone 14 Pro Max"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">IMEI or Serial</label>
                  <input
                    type="text"
                    value={imeiOrSerial}
                    onChange={(e) => setImeiOrSerial(e.target.value)}
                    placeholder="354892..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Passcode / PIN (for testing)</label>
                <input
                  type="text"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="e.g. 1234 or Pattern"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Reported Fault / Issue *</label>
                <textarea
                  required
                  rows={2}
                  value={faultDescription}
                  onChange={(e) => setFaultDescription(e.target.value)}
                  placeholder="Describe problem (e.g. Broken display, touch unresponsive)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Estimated Cost (LKR)</label>
                  <input
                    type="number"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Advance Deposit (LKR)</label>
                  <input
                    type="number"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Assigned Technician</label>
                <input
                  type="text"
                  value={assignedTechnician}
                  onChange={(e) => setAssignedTechnician(e.target.value)}
                  placeholder="e.g. Nuwan Pradeep"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
