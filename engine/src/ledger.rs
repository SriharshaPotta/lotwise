//! The core: replay every trade in date order, keep tax lots per account, realize sales against
//! lots, and apply the wash-sale rule across all accounts.

use crate::date::Date;
use crate::model::{AccountKind, Instrument, Method, OptionKind, Portfolio, Side, Trade};
use crate::money::{cents_str, min, qty_str, Decimal};
use crate::rules::{self, Term, WASH_WINDOW_DAYS};
use serde::Serialize;
use std::collections::HashMap;

pub type Result<T> = std::result::Result<T, String>;

/// An open tax lot.
#[derive(Clone, Debug)]
pub struct Lot {
    pub id: String,
    /// The buy trade that opened it.
    pub trade_id: String,
    pub account: String,
    pub instrument: Instrument,
    /// Units: shares, or contracts for options.
    pub qty: Decimal,
    /// Total cost basis (exact), including any wash-sale adjustment.
    pub basis: Decimal,
    /// The day it was actually bought.
    pub acquired: Date,
    /// Start of the holding period (earlier than `acquired` when a wash sale tacked days on).
    pub holding_start: Date,
    /// Disallowed loss added to the basis.
    pub wash_adjustment: Decimal,
    /// Already used as the replacement for a wash sale (each share can absorb one loss share).
    pub replacement: bool,
    seq: usize,
}

impl Lot {
    pub fn share_equivalents(&self) -> Decimal {
        self.qty * self.instrument.multiplier()
    }
    pub fn cost_per_share(&self) -> Decimal {
        if self.qty.is_zero() {
            Decimal::ZERO
        } else {
            self.basis / self.share_equivalents()
        }
    }
}

/// Serializable view of a lot.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LotView {
    pub id: String,
    pub trade_id: String,
    pub account: String,
    pub symbol: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub option: Option<crate::model::OptionSpec>,
    #[serde(with = "qty_str")]
    pub qty: Decimal,
    #[serde(with = "qty_str")]
    pub multiplier: Decimal,
    #[serde(with = "cents_str")]
    pub basis: Decimal,
    /// Per share (per share of the underlying for options), 4 decimals.
    #[serde(with = "qty_str")]
    pub cost_per_share: Decimal,
    pub acquired: Date,
    pub holding_start: Date,
    pub long_term_from: Date,
    pub section1256: bool,
    #[serde(with = "cents_str")]
    pub wash_adjustment: Decimal,
    pub wash_replacement: bool,
}

impl From<&Lot> for LotView {
    fn from(l: &Lot) -> Self {
        LotView {
            id: l.id.clone(),
            trade_id: l.trade_id.clone(),
            account: l.account.clone(),
            symbol: l.instrument.symbol.clone(),
            label: l.instrument.label(),
            option: l.instrument.option.clone(),
            qty: l.qty,
            multiplier: l.instrument.multiplier(),
            basis: l.basis,
            cost_per_share: l.cost_per_share().round_dp(4),
            acquired: l.acquired,
            holding_start: l.holding_start,
            long_term_from: l.holding_start.long_term_from(),
            section1256: l.instrument.is_section_1256(),
            wash_adjustment: l.wash_adjustment,
            wash_replacement: l.replacement,
        }
    }
}

/// One purchase that a loss was matched against.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WashMatch {
    /// The replacement purchase (a buy, or a written deep-in-the-money put).
    pub trade_id: String,
    pub account: String,
    pub account_kind: AccountKind,
    pub date: Date,
    pub symbol: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub option: Option<crate::model::OptionSpec>,
    /// Share-equivalents matched.
    #[serde(with = "qty_str")]
    pub shares: Decimal,
    #[serde(with = "cents_str")]
    pub disallowed: Decimal,
    /// Bought in an IRA/Roth: the loss is gone for good (no basis adjustment).
    pub permanent: bool,
    /// The purchase came before the sale (true) or after it (false).
    pub before_sale: bool,
}

/// One lot (or part of a lot) disposed of by a sale.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Realization {
    pub sale_id: String,
    pub lot_id: String,
    pub lot_trade_id: String,
    pub account: String,
    pub symbol: String,
    pub label: String,
    #[serde(with = "qty_str")]
    pub qty: Decimal,
    pub acquired: Date,
    pub holding_start: Date,
    pub date: Date,
    #[serde(with = "cents_str")]
    pub proceeds: Decimal,
    #[serde(with = "cents_str")]
    pub basis: Decimal,
    /// Proceeds − basis.
    #[serde(with = "cents_str")]
    pub realized: Decimal,
    /// Loss disallowed by wash sales (positive), temporary or permanent.
    #[serde(with = "cents_str")]
    pub disallowed: Decimal,
    /// The part of `disallowed` that is permanent (replacement bought in an IRA/Roth).
    #[serde(with = "cents_str")]
    pub disallowed_permanent: Decimal,
    /// What hits this year's return: realized + disallowed (0 inside an IRA/Roth).
    #[serde(with = "cents_str")]
    pub recognized: Decimal,
    pub term: Term,
    #[serde(with = "cents_str")]
    pub short_term: Decimal,
    #[serde(with = "cents_str")]
    pub long_term: Decimal,
    /// Recognized × rate; negative means a deduction.
    #[serde(with = "cents_str")]
    pub est_tax: Decimal,
    pub tax_exempt: bool,
    pub wash: Vec<WashMatch>,
}

#[derive(Clone, Debug, Default)]
pub struct Ledger {
    pub lots: Vec<Lot>,
    pub realizations: Vec<Realization>,
}

impl Ledger {
    pub fn lot_views(&self) -> Vec<LotView> {
        self.lots.iter().map(LotView::from).collect()
    }
}

struct Pending {
    shares: Decimal,
    amount: Decimal,
    days_held: i32,
    permanent: bool,
}

/// A written put flagged deep in the money: acts as a contract to buy the stock.
struct Write {
    trade_id: String,
    account: String,
    date: Date,
    instrument: Instrument,
    capacity: Decimal,
    used: Decimal,
    seq: usize,
}

struct Replay<'a> {
    p: &'a Portfolio,
    order: Vec<usize>,
    lots: Vec<Lot>,
    writes: Vec<Write>,
    pending: HashMap<String, Vec<Pending>>,
    future_used: HashMap<String, Decimal>,
    splits: HashMap<String, u32>,
    realizations: Vec<Realization>,
    seq: usize,
}

/// Replays the whole portfolio.
pub fn replay(p: &Portfolio) -> Result<Ledger> {
    replay_until(p, None)
}

/// Replays trades dated on or before `as_of` (all trades when `None`).
pub fn replay_until(p: &Portfolio, as_of: Option<Date>) -> Result<Ledger> {
    validate(p)?;
    let mut order: Vec<usize> = (0..p.trades.len()).filter(|&i| as_of.is_none_or(|d| p.trades[i].date <= d)).collect();
    order.sort_by_key(|&i| (p.trades[i].date, i));
    let mut r = Replay {
        p,
        order,
        lots: vec![],
        writes: vec![],
        pending: HashMap::new(),
        future_used: HashMap::new(),
        splits: HashMap::new(),
        realizations: vec![],
        seq: 0,
    };
    for pos in 0..r.order.len() {
        let t = &p.trades[r.order[pos]];
        match t.side {
            Side::Buy => r.buy(t),
            Side::Sell if r.is_write(t) => r.write(t),
            Side::Sell => r.sell(t, pos)?,
        }
    }
    Ok(Ledger { lots: r.lots, realizations: r.realizations })
}

fn validate(p: &Portfolio) -> Result<()> {
    let mut seen = std::collections::HashSet::new();
    for a in &p.accounts {
        if !seen.insert(a.id.as_str()) {
            return Err(format!("duplicate account id {:?}", a.id));
        }
    }
    let mut ids = std::collections::HashSet::new();
    for t in &p.trades {
        if !ids.insert(t.id.as_str()) {
            return Err(format!("duplicate trade id {:?}", t.id));
        }
        if p.account(&t.account).is_none() {
            return Err(format!("trade {:?} names unknown account {:?}", t.id, t.account));
        }
        if t.qty <= Decimal::ZERO {
            return Err(format!("trade {:?}: qty must be positive", t.id));
        }
        if t.price < Decimal::ZERO || t.fees < Decimal::ZERO {
            return Err(format!("trade {:?}: price and fees can't be negative", t.id));
        }
        if t.symbol.trim().is_empty() {
            return Err(format!("trade {:?}: symbol is empty", t.id));
        }
        if let Some(o) = &t.option {
            if o.multiplier <= Decimal::ZERO {
                return Err(format!("trade {:?}: option multiplier must be positive", t.id));
            }
        }
    }
    Ok(())
}

impl Replay<'_> {
    fn kind(&self, account: &str) -> AccountKind {
        self.p.account(account).map(|a| a.kind).unwrap_or(AccountKind::Taxable)
    }

    fn next_seq(&mut self) -> usize {
        self.seq += 1;
        self.seq
    }

    fn split_id(&mut self, trade_id: &str) -> String {
        let n = self.splits.entry(trade_id.to_string()).or_insert(0);
        *n += 1;
        format!("{trade_id}#{n}")
    }

    fn is_write(&self, t: &Trade) -> bool {
        let Some(o) = &t.option else { return false };
        if o.kind != OptionKind::Put || !o.deep_itm {
            return false;
        }
        let key = Instrument::of(t).key();
        !self.lots.iter().any(|l| l.account == t.account && l.instrument.key() == key)
    }

    fn write(&mut self, t: &Trade) {
        let instrument = Instrument::of(t);
        let capacity = t.qty * instrument.multiplier();
        let used = self.future_used.get(&t.id).copied().unwrap_or_default();
        let seq = self.next_seq();
        self.writes.push(Write { trade_id: t.id.clone(), account: t.account.clone(), date: t.date, instrument, capacity, used, seq });
    }

    fn buy(&mut self, t: &Trade) {
        let instrument = Instrument::of(t);
        let mult = instrument.multiplier();
        let unit_cost = (t.qty * t.price * mult + t.fees) / t.qty;
        let mut remaining = t.qty;
        for adj in self.pending.remove(&t.id).unwrap_or_default() {
            let units = min(adj.shares / mult, remaining);
            if units.is_zero() {
                continue;
            }
            remaining -= units;
            let (amount, start) = if adj.permanent { (Decimal::ZERO, t.date) } else { (adj.amount, t.date.add_days(-adj.days_held)) };
            let id = self.split_id(&t.id);
            let seq = self.next_seq();
            self.lots.push(Lot {
                id,
                trade_id: t.id.clone(),
                account: t.account.clone(),
                instrument: instrument.clone(),
                qty: units,
                basis: unit_cost * units + amount,
                acquired: t.date,
                holding_start: start,
                wash_adjustment: amount,
                replacement: true,
                seq,
            });
        }
        if remaining > Decimal::ZERO {
            let seq = self.next_seq();
            self.lots.push(Lot {
                id: t.id.clone(),
                trade_id: t.id.clone(),
                account: t.account.clone(),
                instrument,
                qty: remaining,
                basis: unit_cost * remaining,
                acquired: t.date,
                holding_start: t.date,
                wash_adjustment: Decimal::ZERO,
                replacement: false,
                seq,
            });
        }
    }

    /// Picks (lot index, units) for a sale, by the trade's method.
    fn pick(&self, t: &Trade, key: &str) -> Result<Vec<(usize, Decimal)>> {
        let mut open: Vec<usize> = (0..self.lots.len())
            .filter(|&i| self.lots[i].account == t.account && self.lots[i].instrument.key() == key && self.lots[i].qty > Decimal::ZERO)
            .collect();
        let held: Decimal = open.iter().map(|&i| self.lots[i].qty).sum();
        if t.qty > held {
            return Err(format!(
                "trade {:?}: selling {} {} in {:?} on {} but only {} held",
                t.id,
                t.qty.normalize(),
                key,
                t.account,
                t.date,
                held.normalize()
            ));
        }
        let fifo = |l: &Lot| (l.acquired, l.seq);
        open.sort_by_key(|&i| fifo(&self.lots[i]));
        let method = t.method.unwrap_or(if t.lots.is_some() { Method::Specific } else { self.p.settings.method });
        let mut picks = vec![];
        let mut left = t.qty;
        match method {
            Method::Specific => {
                let wanted = t.lots.as_deref().unwrap_or_default();
                if wanted.is_empty() {
                    return Err(format!("trade {:?}: specific-lot sale names no lots", t.id));
                }
                let mut taken: HashMap<usize, Decimal> = HashMap::new();
                for w in wanted {
                    let mut want = w.qty.unwrap_or(Decimal::MAX);
                    for &i in &open {
                        let l = &self.lots[i];
                        if l.id != w.lot_id && l.trade_id != w.lot_id {
                            continue;
                        }
                        let avail = l.qty - taken.get(&i).copied().unwrap_or_default();
                        let take = min(min(avail, want), left);
                        if take > Decimal::ZERO {
                            *taken.entry(i).or_default() += take;
                            picks.push((i, take));
                            want -= take;
                            left -= take;
                        }
                    }
                    if let Some(q) = w.qty.filter(|_| want > Decimal::ZERO) {
                        return Err(format!("trade {:?}: lot {:?} doesn't have {} units", t.id, w.lot_id, q.normalize()));
                    }
                }
                if left > Decimal::ZERO {
                    return Err(format!(
                        "trade {:?}: the named lots cover only {} of {}",
                        t.id,
                        (t.qty - left).normalize(),
                        t.qty.normalize()
                    ));
                }
                return Ok(picks);
            }
            Method::Fifo => {}
            Method::Lifo => open.reverse(),
            Method::Hifo => open.sort_by(|&a, &b| {
                let (la, lb) = (&self.lots[a], &self.lots[b]);
                lb.cost_per_share().cmp(&la.cost_per_share()).then(fifo(la).cmp(&fifo(lb)))
            }),
        }
        for i in open {
            if left.is_zero() {
                break;
            }
            let take = min(self.lots[i].qty, left);
            picks.push((i, take));
            left -= take;
        }
        Ok(picks)
    }

    fn sell(&mut self, t: &Trade, pos: usize) -> Result<()> {
        let instrument = Instrument::of(t);
        let mult = instrument.multiplier();
        let picks = self.pick(t, &instrument.key())?;
        let proceeds_total = t.qty * t.price * mult - t.fees;

        struct Piece {
            lot_id: String,
            trade_id: String,
            acquired: Date,
            holding_start: Date,
            units: Decimal,
            basis: Decimal,
            proceeds: Decimal,
        }
        let mut pieces = vec![];
        for (i, units) in picks {
            let l = &mut self.lots[i];
            let basis = if units == l.qty { l.basis } else { l.basis * units / l.qty };
            let adj = if units == l.qty { l.wash_adjustment } else { l.wash_adjustment * units / l.qty };
            pieces.push(Piece {
                lot_id: l.id.clone(),
                trade_id: l.trade_id.clone(),
                acquired: l.acquired,
                holding_start: l.holding_start,
                units,
                basis,
                proceeds: proceeds_total * units / t.qty,
            });
            l.qty -= units;
            l.basis -= basis;
            l.wash_adjustment -= adj;
        }
        self.lots.retain(|l| l.qty > Decimal::ZERO);

        let tax_exempt = self.kind(&t.account).tax_advantaged();
        let is_1256 = instrument.is_section_1256();
        let (st_rate, lt_rate) = (self.p.settings.st_rate, self.p.settings.lt_rate);
        for pc in pieces {
            let realized = pc.proceeds - pc.basis;
            let term = rules::term(pc.holding_start, t.date, is_1256);
            let mut wash = vec![];
            if realized < Decimal::ZERO && !tax_exempt && !is_1256 {
                let days_held = pc.holding_start.days_until(t.date);
                wash = self.match_replacements(&instrument, &pc.trade_id, t.date, pos, pc.units * mult, -realized, days_held);
            }
            let disallowed: Decimal = wash.iter().map(|w| w.disallowed).sum();
            let disallowed_permanent: Decimal = wash.iter().filter(|w| w.permanent).map(|w| w.disallowed).sum();
            let recognized = if tax_exempt { Decimal::ZERO } else { realized + disallowed };
            let (st, lt) = rules::split_by_term(recognized, term);
            self.realizations.push(Realization {
                sale_id: t.id.clone(),
                lot_id: pc.lot_id,
                lot_trade_id: pc.trade_id,
                account: t.account.clone(),
                symbol: instrument.symbol.clone(),
                label: instrument.label(),
                qty: pc.units,
                acquired: pc.acquired,
                holding_start: pc.holding_start,
                date: t.date,
                proceeds: pc.proceeds,
                basis: pc.basis,
                realized,
                disallowed,
                disallowed_permanent,
                recognized,
                term,
                short_term: st,
                long_term: lt,
                est_tax: st * st_rate + lt * lt_rate,
                tax_exempt,
                wash,
            });
        }
        Ok(())
    }

    /// Matches a loss of `loss` (positive) on `need` share-equivalents sold on `date` against
    /// substantially identical purchases from 30 days before to 30 days after, in order of
    /// acquisition. Prior purchases still held are adjusted now; later ones when they're bought.
    #[allow(clippy::too_many_arguments)]
    fn match_replacements(
        &mut self,
        sold: &Instrument,
        sold_trade: &str,
        date: Date,
        pos: usize,
        need_total: Decimal,
        loss: Decimal,
        days_held: i32,
    ) -> Vec<WashMatch> {
        let lo = date.add_days(-WASH_WINDOW_DAYS);
        let hi = date.add_days(WASH_WINDOW_DAYS);
        let mut need = need_total;
        let mut out = vec![];

        // Purchases on or before the sale that are still held, plus written deep-ITM puts.
        enum Cand {
            Lot(usize),
            Write(usize),
        }
        let mut prior: Vec<(Date, usize, Cand)> = vec![];
        for (i, l) in self.lots.iter().enumerate() {
            if !l.replacement
                && l.trade_id != sold_trade
                && l.acquired >= lo
                && l.acquired <= date
                && rules::substantially_identical(sold, &l.instrument)
            {
                prior.push((l.acquired, l.seq, Cand::Lot(i)));
            }
        }
        for (i, w) in self.writes.iter().enumerate() {
            if w.used < w.capacity && w.date >= lo && w.date <= date && rules::substantially_identical(sold, &w.instrument) {
                prior.push((w.date, w.seq, Cand::Write(i)));
            }
        }
        prior.sort_by_key(|(d, s, _)| (*d, *s));

        for (_, _, cand) in prior {
            if need.is_zero() {
                break;
            }
            match cand {
                Cand::Lot(i) => {
                    let mult = self.lots[i].instrument.multiplier();
                    let take = min(need, self.lots[i].share_equivalents());
                    let part = loss * take / need_total;
                    let units = take / mult;
                    // Split off the matched units when the lot is bigger than the match.
                    let target = if units < self.lots[i].qty {
                        let trade_id = self.lots[i].trade_id.clone();
                        let id = self.split_id(&trade_id);
                        let seq = self.next_seq();
                        let src = &mut self.lots[i];
                        let basis = src.basis * units / src.qty;
                        let mut m = src.clone();
                        m.id = id;
                        m.seq = seq;
                        m.qty = units;
                        m.basis = basis;
                        m.wash_adjustment = Decimal::ZERO;
                        src.qty -= units;
                        src.basis -= basis;
                        self.lots.push(m);
                        self.lots.len() - 1
                    } else {
                        i
                    };
                    let kind = self.kind(&self.lots[target].account);
                    let l = &mut self.lots[target];
                    l.replacement = true;
                    let permanent = kind.tax_advantaged();
                    if !permanent {
                        l.basis += part;
                        l.wash_adjustment += part;
                        l.holding_start = l.acquired.add_days(-days_held);
                    }
                    out.push(WashMatch {
                        trade_id: l.trade_id.clone(),
                        account: l.account.clone(),
                        account_kind: kind,
                        date: l.acquired,
                        symbol: l.instrument.symbol.clone(),
                        label: l.instrument.label(),
                        option: l.instrument.option.clone(),
                        shares: take,
                        disallowed: part,
                        permanent,
                        before_sale: true,
                    });
                    need -= take;
                }
                Cand::Write(i) => {
                    let kind = self.kind(&self.writes[i].account);
                    let w = &mut self.writes[i];
                    let take = min(need, w.capacity - w.used);
                    let part = loss * take / need_total;
                    w.used += take;
                    out.push(WashMatch {
                        trade_id: w.trade_id.clone(),
                        account: w.account.clone(),
                        account_kind: kind,
                        date: w.date,
                        symbol: w.instrument.symbol.clone(),
                        label: w.instrument.label(),
                        option: w.instrument.option.clone(),
                        shares: take,
                        disallowed: part,
                        permanent: kind.tax_advantaged(),
                        before_sale: true,
                    });
                    need -= take;
                }
            }
        }

        // Purchases after the sale, within 30 days.
        let p = self.p;
        let later: Vec<usize> = self.order[pos + 1..].to_vec();
        for j in later {
            if need.is_zero() {
                break;
            }
            let t = &p.trades[j];
            if t.date > hi {
                break;
            }
            let inst = Instrument::of(t);
            let writes_put = t.side == Side::Sell && inst.option.as_ref().is_some_and(|o| o.kind == OptionKind::Put && o.deep_itm);
            if !(t.side == Side::Buy || writes_put) || !rules::substantially_identical(sold, &inst) {
                continue;
            }
            let used = self.future_used.get(&t.id).copied().unwrap_or_default();
            let take = min(need, t.qty * inst.multiplier() - used);
            if take <= Decimal::ZERO {
                continue;
            }
            let part = loss * take / need_total;
            let kind = self.kind(&t.account);
            let permanent = kind.tax_advantaged();
            *self.future_used.entry(t.id.clone()).or_default() += take;
            if t.side == Side::Buy {
                self.pending.entry(t.id.clone()).or_default().push(Pending { shares: take, amount: part, days_held, permanent });
            }
            out.push(WashMatch {
                trade_id: t.id.clone(),
                account: t.account.clone(),
                account_kind: kind,
                date: t.date,
                symbol: inst.symbol.clone(),
                label: inst.label(),
                option: inst.option.clone(),
                shares: take,
                disallowed: part,
                permanent,
                before_sale: false,
            });
            need -= take;
        }
        out
    }
}

/// Totals over a set of realizations.
pub fn sum<'a>(rs: impl IntoIterator<Item = &'a Realization>, f: impl Fn(&Realization) -> Decimal) -> Decimal {
    rs.into_iter().map(f).sum()
}

#[allow(dead_code)]
pub(crate) fn term_of(rs: &[&Realization]) -> &'static str {
    let mut terms = rs.iter().map(|r| r.term);
    match terms.next() {
        None => "none",
        Some(first) if rs.iter().all(|r| r.term == first) => match first {
            Term::Short => "short",
            Term::Long => "long",
            Term::S1256 => "1256",
        },
        _ => "mixed",
    }
}
