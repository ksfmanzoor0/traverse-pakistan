"use client";

import { useState, useTransition } from "react";
import type { LetterData } from "@/lib/invitation/letterData";
import type { Traveler } from "@/lib/invitation/types";

type Props = {
  bookingRef: string;
  initialData: LetterData;
  status: string;
  saveAction: (ref: string, data: LetterData) => Promise<{ ok: boolean; error?: string }>;
  sendAction: (ref: string) => Promise<{ ok: boolean; error?: string }>;
};

export function InvitationLetterEditor({ bookingRef, initialData, status, saveAction, sendAction }: Props) {
  const [data, setData] = useState<LetterData>(initialData);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function updateHeader<K extends keyof LetterData["header"]>(key: K, value: LetterData["header"][K]) {
    setData((d) => ({ ...d, header: { ...d.header, [key]: value } }));
  }
  function updateTraveler(i: number, patch: Partial<Traveler>) {
    setData((d) => ({ ...d, travelers: d.travelers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) }));
  }
  function addTraveler() {
    setData((d) => ({
      ...d,
      travelers: [...d.travelers, { full_name: "", date_of_birth: "", nationality: "", passport_number: "", passport_expiry: "" }],
    }));
  }
  function removeTraveler(i: number) {
    setData((d) => ({ ...d, travelers: d.travelers.filter((_, idx) => idx !== i) }));
  }
  function onSave() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveAction(bookingRef, data);
      setMsg(res.ok ? "Saved." : res.error ?? "Save failed");
      setTimeout(() => setMsg(null), 3000);
    });
  }
  function onSend() {
    setMsg(null);
    if (!confirm("Send this letter to the traveler and mark as issued?")) return;
    startTransition(async () => {
      const save = await saveAction(bookingRef, data);
      if (!save.ok) { setMsg(save.error ?? "Save failed"); return; }
      const send = await sendAction(bookingRef);
      setMsg(send.ok ? "Letter sent." : send.error ?? "Send failed");
    });
  }

  const inputCls = "w-full px-2 py-1 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px]";
  const labelCls = "block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
      {/* Editor pane */}
      <div className="space-y-5">
        <div className="p-4 rounded border border-[var(--border-default)]">
          <h3 className="text-[13px] font-bold text-[var(--text-primary)] mb-3">Addressee</h3>
          <div className="space-y-2">
            <div><label className={labelCls}>To (title)</label>
              <input value={data.addressee_name} onChange={(e) => setData({ ...data, addressee_name: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Embassy</label>
              <input value={data.embassy_name} onChange={(e) => setData({ ...data, embassy_name: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Subject</label>
              <input value={data.subject} onChange={(e) => setData({ ...data, subject: e.target.value })} className={inputCls} /></div>
          </div>
        </div>

        <div className="p-4 rounded border border-[var(--border-default)]">
          <h3 className="text-[13px] font-bold text-[var(--text-primary)] mb-3">Body</h3>
          <div className="space-y-2">
            <div><label className={labelCls}>Intro paragraph</label>
              <textarea rows={5} value={data.body_intro} onChange={(e) => setData({ ...data, body_intro: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Closing paragraph</label>
              <textarea rows={3} value={data.body_close} onChange={(e) => setData({ ...data, body_close: e.target.value })} className={inputCls} /></div>
          </div>
        </div>

        <div className="p-4 rounded border border-[var(--border-default)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Travelers</h3>
            <button type="button" onClick={addTraveler} className="text-[12px] font-semibold text-[var(--primary)]">+ Add</button>
          </div>
          <div className="space-y-3">
            {data.travelers.map((t, i) => (
              <div key={i} className="p-3 rounded bg-[var(--bg-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">Traveler {i + 1}</span>
                  {data.travelers.length > 1 && (
                    <button type="button" onClick={() => removeTraveler(i)} className="text-[11px] text-[var(--error)]">Remove</button>
                  )}
                </div>
                <input placeholder="Full name" value={t.full_name} onChange={(e) => updateTraveler(i, { full_name: e.target.value })} className={inputCls} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="DOB" value={t.date_of_birth} onChange={(e) => updateTraveler(i, { date_of_birth: e.target.value })} className={inputCls} />
                  <input placeholder="Nationality" value={t.nationality} onChange={(e) => updateTraveler(i, { nationality: e.target.value })} className={inputCls} />
                  <input placeholder="Passport #" value={t.passport_number} onChange={(e) => updateTraveler(i, { passport_number: e.target.value })} className={inputCls} />
                  <input placeholder="Expiry" value={t.passport_expiry} onChange={(e) => updateTraveler(i, { passport_expiry: e.target.value })} className={inputCls} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded border border-[var(--border-default)]">
          <h3 className="text-[13px] font-bold text-[var(--text-primary)] mb-3">Signer & date</h3>
          <div className="space-y-2">
            <div><label className={labelCls}>Signer name</label>
              <input value={data.signer_name} onChange={(e) => setData({ ...data, signer_name: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Signer title</label>
              <input value={data.signer_title} onChange={(e) => setData({ ...data, signer_title: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Date</label>
              <input value={data.issued_date} onChange={(e) => setData({ ...data, issued_date: e.target.value })} className={inputCls} /></div>
          </div>
        </div>

        <details className="p-4 rounded border border-[var(--border-default)]">
          <summary className="text-[13px] font-bold text-[var(--text-primary)] cursor-pointer">Header (address, licence #, NTN)</summary>
          <div className="space-y-2 mt-3">
            <input value={data.header.address_line_1} onChange={(e) => updateHeader("address_line_1", e.target.value)} className={inputCls} />
            <input value={data.header.address_line_2} onChange={(e) => updateHeader("address_line_2", e.target.value)} className={inputCls} />
            <input value={data.header.city} onChange={(e) => updateHeader("city", e.target.value)} className={inputCls} />
            <input value={data.header.phone} onChange={(e) => updateHeader("phone", e.target.value)} className={inputCls} />
            <input value={data.header.dts_licence} onChange={(e) => updateHeader("dts_licence", e.target.value)} className={inputCls} />
            <input value={data.header.secp_incorporation} onChange={(e) => updateHeader("secp_incorporation", e.target.value)} className={inputCls} />
            <input value={data.header.ntn} onChange={(e) => updateHeader("ntn", e.target.value)} className={inputCls} />
          </div>
        </details>

        <div className="sticky bottom-0 py-4 bg-[var(--bg-primary)] border-t border-[var(--border-default)] flex gap-3 items-center flex-wrap">
          <button type="button" onClick={onSave} disabled={pending}
            className="h-10 px-4 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[13px] font-semibold text-[var(--text-primary)] disabled:opacity-50">
            {pending ? "Saving…" : "Save draft"}
          </button>
          <a href={`/api/admin/invitation-letter/${bookingRef}/pdf`} target="_blank" rel="noopener"
            className="h-10 px-4 inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[13px] font-semibold text-[var(--text-primary)]">
            Download PDF
          </a>
          <button type="button" onClick={onSend} disabled={pending || (status !== "paid" && status !== "issued")}
            className="h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[13px] font-semibold disabled:opacity-50">
            {status === "issued" ? "Re-send letter" : "Send letter to traveler"}
          </button>
          {msg && <span className="text-[12px] text-[var(--text-secondary)]">{msg}</span>}
        </div>
      </div>

      {/* Preview pane */}
      <div className="rounded border border-[var(--border-default)] overflow-hidden">
        <div className="px-3 py-2 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] text-[12px] text-[var(--text-tertiary)]">Live preview</div>
        <LetterPreview data={data} />
      </div>
    </div>
  );
}

export function LetterPreview({ data }: { data: LetterData }) {
  return (
    <div className="p-8 bg-white text-[#111] font-serif text-[14px] leading-relaxed" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      <div className="border-t-[3px] border-[#1e40af] pt-6">
        <div className="grid grid-cols-2 gap-6 items-start">
          <img src="/logo-day.png" alt="Traverse Pakistan" className="h-24 w-auto" />
          <div className="text-right text-[13px] space-y-3 text-[#111]">
            <div className="text-[#1e40af]">
              <div>{data.header.address_line_1}</div>
              <div>{data.header.address_line_2}</div>
              <div>{data.header.city}</div>
              <div>{data.header.phone}</div>
            </div>
            <div className="text-[#1e40af]"><strong>DTS Licence ID:</strong> {data.header.dts_licence}</div>
            <div className="text-[#1e40af]"><strong>SECP Incorporation #:</strong> {data.header.secp_incorporation}</div>
            <div><strong>NTN:</strong> {data.header.ntn}</div>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-1">
        <div>To</div>
        <div>{data.addressee_name}</div>
        <div>{data.embassy_name}</div>
      </div>

      <div className="mt-6">
        <div><strong>Subject:</strong> &nbsp;&nbsp;<u>{data.subject}</u></div>
      </div>

      <div className="mt-4 whitespace-pre-wrap">{data.body_intro}</div>

      <div className="mt-6">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              {["NAME", "Date of Birth", "Nationality", "Passport No.", "Expiry Date"].map((h) => (
                <th key={h} className="text-white bg-[#1e40af] border border-[#1e40af] px-2 py-2 text-center font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.travelers.map((t, i) => (
              <tr key={i}>
                <td className="border border-[#e5e7eb] px-2 py-2 uppercase">{t.full_name}</td>
                <td className="border border-[#e5e7eb] px-2 py-2">{t.date_of_birth}</td>
                <td className="border border-[#e5e7eb] px-2 py-2">{t.nationality}</td>
                <td className="border border-[#e5e7eb] px-2 py-2">{t.passport_number}</td>
                <td className="border border-[#e5e7eb] px-2 py-2">{t.passport_expiry}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">{data.body_close}</div>

      <div className="mt-10">
        <div>{data.signer_name}</div>
        <div>{data.signer_title}</div>
        <div className="mt-6 flex items-end gap-2">
          <div>
            <div className="h-14 w-64 border border-dashed border-[#9ca3af] flex items-center justify-center text-[11px] text-[#9ca3af] mb-1">
              [signature placeholder — /public/signature.png]
            </div>
            <div className="border-t border-black w-64"></div>
            <div className="text-[12px]">Sign</div>
          </div>
          <div className="ml-auto text-[13px]">
            Date: {data.issued_date}
          </div>
        </div>
      </div>

      <div className="mt-16 border-t border-[#e5e7eb] pt-2 text-right text-[11px] text-[#6b7280]">1</div>
    </div>
  );
}
