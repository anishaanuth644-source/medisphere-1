// src/pages/billing/BillingPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { Receipt, Plus, Download, DollarSign, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { getBillingRecords, generateReceiptPDF } from "../../services/billingService";
import {
  GlassCard, SectionHeader, SearchInput, StatusBadge, KPICard,
  PrimaryBtn, GhostBtn,
} from "../../components/ui/index";
import { DataTable } from "../../components/DataTable";

export function BillingPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    getBillingRecords()
      .then(setRecords)
      .catch(() => toast.error("Failed to load billing records"))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    if (!search.trim()) return records;
    return records.filter(
      (r) =>
        r.patientName?.toLowerCase().includes(search.toLowerCase()) ||
        r.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
    );
  }, [records, search]);

  const totalBilled = records.reduce((a, r) => a + (r.totalAmount || 0), 0);
  const outstanding = records
    .filter((r) => r.status === "Pending" || r.status === "Overdue")
    .reduce((a, r) => a + (r.totalAmount || 0), 0);
  const insuranceCount = records.filter((r) => r.status === "Insurance review").length;

  const handleDownloadPDF = async (billing) => {
    setDownloading(billing.id);
    try {
      const blob = await generateReceiptPDF(billing);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${billing.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Receipt downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Billing & insurance" subtitle="Invoices, payments, and claim management">
        <PrimaryBtn icon={Plus} onClick={() => toast("Open new invoice form")}>
          Generate invoice
        </PrimaryBtn>
      </SectionHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          icon={DollarSign}
          label="Total billed (all time)"
          value={`₹${(totalBilled / 100000).toFixed(1)}L`}
          tone="green"
          loading={loading}
        />
        <KPICard
          icon={Receipt}
          label="Outstanding"
          value={`₹${(outstanding / 100000).toFixed(1)}L`}
          tone="red"
          deltaTone="red"
          loading={loading}
        />
        <KPICard
          icon={ShieldCheck}
          label="Insurance claims in review"
          value={insuranceCount}
          tone="indigo"
          loading={loading}
        />
      </div>

      <GlassCard noPad>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="w-64">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by patient or invoice #…" />
          </div>
        </div>
        <DataTable
          columns={["Invoice #", "Patient", "Amount", "Insurer", "Date", "Status", ""]}
          rows={rows}
          loading={loading}
          emptyIcon={Receipt}
          emptyTitle="No invoices yet"
          renderRow={(b) => (
            <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <td className="px-4 py-3 text-xs text-slate-400 font-mono">{b.invoiceNumber}</td>
              <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">{b.patientName}</td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                ₹{b.totalAmount?.toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{b.insuranceId ? "Insurance" : "Self-pay"}</td>
              <td className="px-4 py-3 text-xs text-slate-400">
                {b.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || "—"}
              </td>
              <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
              <td className="px-4 py-3">
                <button
                  onClick={() => handleDownloadPDF(b)}
                  disabled={downloading === b.id}
                  title="Download PDF receipt"
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-50"
                >
                  <Download size={15} />
                </button>
              </td>
            </tr>
          )}
        />
      </GlassCard>
    </div>
  );
}
