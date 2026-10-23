import React, { useMemo, useState } from 'react';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import TableExportButtons from '../../components/TableExportButtons';
import { EmptyState, Field, PageHeader, SearchBox, Section, SegTabs, money, tableProps, usePaged } from '../../components/ui/PageKit';

/**
 * Shared layout for the Driver / Provider payment pages.
 * Left: record a collection or an advance. Right: history tables with search and Excel/PDF.
 * All data and actions come from the page (each page keeps its own API calls).
 */
export type Party = { _id: string; name: string; cashInHand?: number; advance?: number; phone?: string };
export type HistoryTab = { label: string; columns: DataTableColumn<any>[]; records: any[] };

type Props = {
    title: string;
    subtitle?: string;
    partyLabel: string; // "Driver" | "Provider"
    parties: Party[];
    selectedId: string;
    onSelect: (id: string) => void;
    types: { value: string; label: string }[];
    selectedType: string;
    onType: (t: string) => void;
    // advance form
    amount: number | '';
    setAmount: (n: number | '') => void;
    // cash collection form
    receivedAmount: string;
    setReceivedAmount: (v: string) => void;
    inHandAmount: number;
    setInHandAmount: (n: number) => void;
    validationError?: string;
    remark: string;
    setRemark: (v: string) => void;
    isSubmitting: boolean;
    onSubmit: () => void;
    // history
    tabs: HistoryTab[];
    tabIndex: number;
    setTabIndex: (i: number) => void;
    search: string;
    setSearch: (v: string) => void;
    loading?: boolean;
};

const CashDesk: React.FC<Props> = (p) => {
    const [partyFilter, setPartyFilter] = useState('');
    const party = p.parties.find((x) => x._id === p.selectedId);
    const isAdvance = p.selectedType === 'advance';
    const visibleParties = useMemo(() => {
        const q = partyFilter.trim().toLowerCase();
        const list = q ? p.parties.filter((x) => (x.name || '').toLowerCase().includes(q) || (x.phone || '').includes(q)) : p.parties;
        // keep the selected one in the list even when filtered out
        return party && !list.includes(party) ? [party, ...list] : list;
    }, [p.parties, partyFilter, party]);

    const withCash = p.parties.filter((x) => (x.cashInHand || 0) > 0);
    const totalCash = withCash.reduce((s, x) => s + (x.cashInHand || 0), 0);
    const tab = p.tabs[p.tabIndex] || p.tabs[0];
    const tableId = `cashdesk-${p.partyLabel.toLowerCase()}-table`;
    const remaining = (Number(p.inHandAmount) || 0) - (Number(p.receivedAmount) || 0);
    const { pageRows, paging } = usePaged(tab?.records || [], 50);

    return (
        <div>
            <PageHeader
                title={p.title}
                subtitle={p.subtitle}
                actions={
                    <div className="flex gap-4 text-right text-xs">
                        <div>
                            <div className="text-white-dark">{p.partyLabel}s holding cash</div>
                            <div className="text-base font-bold">{withCash.length}</div>
                        </div>
                        <div>
                            <div className="text-white-dark">Total cash with {p.partyLabel.toLowerCase()}s</div>
                            <div className="text-base font-bold text-danger">{money(totalCash)}</div>
                        </div>
                    </div>
                }
            />

            <div className="grid gap-4 lg:grid-cols-3">
                {/* ---- record ---- */}
                <div className="lg:col-span-1">
                    <Section title="Record a payment">
                        <div className="space-y-3">
                            <Field label={p.partyLabel}>
                                {p.parties.length > 12 && (
                                    <input className="form-input form-input-sm mb-1" placeholder={`Filter ${p.partyLabel.toLowerCase()}s…`} value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} />
                                )}
                                <select className="form-select" value={p.selectedId} onChange={(e) => p.onSelect(e.target.value)} aria-label={`Select ${p.partyLabel}`}>
                                    <option value="" disabled>
                                        Select a {p.partyLabel.toLowerCase()}
                                    </option>
                                    {visibleParties.map((x) => (
                                        <option key={x._id} value={x._id}>
                                            {x.name}
                                            {(x.cashInHand || 0) > 0 ? ` · ${money(x.cashInHand)}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            {party && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-md bg-danger/10 p-2">
                                        <div className="text-[11px] text-white-dark">Cash in hand</div>
                                        <div className="text-lg font-bold text-danger">{money(party.cashInHand)}</div>
                                    </div>
                                    <div className="rounded-md bg-warning/10 p-2">
                                        <div className="text-[11px] text-white-dark">Advance</div>
                                        <div className="text-lg font-bold text-warning">{money(party.advance)}</div>
                                    </div>
                                </div>
                            )}

                            {p.types.length > 1 && (
                                <Field label="What are you recording?">
                                    <SegTabs tabs={p.types.map((t) => ({ key: t.value, label: t.label }))} value={p.selectedType} onChange={(k) => p.onType(String(k))} />
                                </Field>
                            )}

                            {isAdvance ? (
                                <Field label="Advance amount (₹)">
                                    <input
                                        type="number"
                                        min={0}
                                        inputMode="numeric"
                                        className="form-input"
                                        value={p.amount}
                                        onChange={(e) => p.setAmount(e.target.value === '' ? '' : +e.target.value)}
                                        disabled={!p.selectedId}
                                        placeholder="0"
                                    />
                                </Field>
                            ) : (
                                <>
                                    <Field label="Amount received (₹)" hint={p.validationError ? <span className="text-danger">{p.validationError}</span> : undefined}>
                                        <input
                                            type="number"
                                            min={0}
                                            inputMode="numeric"
                                            className={`form-input ${p.validationError ? 'border-danger' : ''}`}
                                            value={p.receivedAmount}
                                            onChange={(e) => p.setReceivedAmount(e.target.value)}
                                            disabled={!p.selectedId}
                                            placeholder="0"
                                        />
                                    </Field>
                                    <Field
                                        label="Net cash in hand (₹)"
                                        hint={
                                            p.receivedAmount ? (
                                                <span className={remaining < 0 ? 'text-danger' : 'text-white-dark'}>
                                                    After this: {money(remaining)}
                                                </span>
                                            ) : undefined
                                        }
                                    >
                                        <input type="number" inputMode="numeric" className="form-input" value={p.inHandAmount ?? 0} onChange={(e) => p.setInHandAmount(+e.target.value)} disabled={!p.selectedId} />
                                    </Field>
                                </>
                            )}

                            <Field label="Remark">
                                <input type="text" className="form-input" value={p.remark} onChange={(e) => p.setRemark(e.target.value)} placeholder="e.g. Collected at base, cash" disabled={!p.selectedId} />
                            </Field>

                            <button type="button" className="btn btn-primary w-full" onClick={p.onSubmit} disabled={p.isSubmitting || !p.selectedId}>
                                {p.isSubmitting ? 'Saving…' : isAdvance ? 'Add and settle advance' : 'Settle received amount'}
                            </button>
                        </div>
                    </Section>
                </div>

                {/* ---- history ---- */}
                <div className="lg:col-span-2 min-w-0">
                    <Section
                        title={party ? `${party.name}: history` : 'History'}
                        actions={party && tab ? <TableExportButtons containerId={tableId} title={`${party.name} - ${tab.label}`} /> : undefined}
                        bodyClassName="p-0"
                    >
                        {!party ? (
                            <EmptyState title={`Choose a ${p.partyLabel.toLowerCase()}`} text="Their cash collections, received payments and advances will show here." />
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center gap-2 border-b border-white-light p-3 dark:border-[#1b2e4b]">
                                    {p.tabs.length > 1 && (
                                        <SegTabs
                                            tabs={p.tabs.map((t, i) => ({ key: i, label: t.label, count: t.records?.length ?? 0 }))}
                                            value={p.tabIndex}
                                            onChange={(k) => p.setTabIndex(Number(k))}
                                            className="flex-1"
                                        />
                                    )}
                                    <SearchBox value={p.search} onChange={p.setSearch} placeholder="Search file number or name" className="w-full sm:w-64" />
                                </div>
                                <div id={tableId} className="datatables">
                                    <DataTable {...tableProps} fetching={p.loading} columns={tab?.columns || []} records={pageRows} {...paging} idAccessor="_id" />
                                </div>
                            </>
                        )}
                    </Section>
                </div>
            </div>
        </div>
    );
};

export default CashDesk;
