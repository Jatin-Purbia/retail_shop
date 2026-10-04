import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const unwrap = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
};

const normalizeRate = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

// ---- Inventory (DB uses snake_case, UI uses hindiName/rateA/...) ----

const fromItemRow = (r) => ({
    id: r.id,
    name: r.name,
    hindiName: r.hindi_name,
    unit: r.unit,
    rateA: r.rate_a,
    rateB: r.rate_b,
    rateC: r.rate_c,
});

const toItemRow = (i) => ({
    name: i.name,
    hindi_name: i.hindiName,
    unit: i.unit,
    rate_a: normalizeRate(i.rateA),
    rate_b: normalizeRate(i.rateB),
    rate_c: normalizeRate(i.rateC),
});

export async function listInventory() {
    const rows = unwrap(await supabase.from('inventory').select('*').order('id'));
    return rows.map(fromItemRow);
}

export async function searchInventory(q) {
    if (!q) return [];
    const term = `"%${q.replace(/[\\"]/g, '\\$&')}%"`;
    const rows = unwrap(
        await supabase
            .from('inventory')
            .select('*')
            .or(`name.ilike.${term},hindi_name.ilike.${term}`)
            .limit(10)
    );
    return rows.map(fromItemRow);
}

export async function addInventoryItem(item) {
    return fromItemRow(unwrap(await supabase.from('inventory').insert(toItemRow(item)).select().single()));
}

export async function updateInventoryItem(id, item) {
    return fromItemRow(
        unwrap(await supabase.from('inventory').update(toItemRow(item)).eq('id', id).select().single())
    );
}

export async function deleteInventoryItem(id) {
    unwrap(await supabase.from('inventory').delete().eq('id', id));
}

// ---- Bills ----

const BILL_SUMMARY_COLUMNS =
    'id, customer_name, customer_name_hindi, customer_mobile, alternate_mobile, delivery_date, delivery_time_hindi, total_amount, created_at, updated_at';

const toBillRow = (b) => ({
    customer_name: b.customer_name || null,
    customer_name_hindi: b.customer_name_hindi || null,
    customer_mobile: b.customer_mobile || null,
    alternate_mobile: b.alternate_mobile || null,
    delivery_date: b.delivery_date || null,
    delivery_time_hindi: b.delivery_time_hindi || null,
    items: Array.isArray(b.items) ? b.items : [],
    total_amount: normalizeRate(b.total_amount),
});

export async function listBills() {
    return unwrap(await supabase.from('bills').select(BILL_SUMMARY_COLUMNS).order('id', { ascending: false }));
}

export async function getBill(id) {
    return unwrap(await supabase.from('bills').select('*').eq('id', id).single());
}

export async function createBill(bill) {
    return unwrap(await supabase.from('bills').insert(toBillRow(bill)).select().single());
}

export async function updateBill(id, bill) {
    return unwrap(await supabase.from('bills').update(toBillRow(bill)).eq('id', id).select().single());
}

export async function deleteBill(id) {
    unwrap(await supabase.from('bills').delete().eq('id', id));
}

export async function getNextBillNumber() {
    const rows = unwrap(await supabase.from('bills').select('id').order('id', { ascending: false }).limit(1));
    return rows.length ? Number(rows[0].id) + 1 : 1;
}
