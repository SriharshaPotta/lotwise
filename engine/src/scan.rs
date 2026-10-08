//! Portfolio scans: harvestable losses, the long-term countdown, and the year's realized summary.

use crate::date::Date;
use crate::ledger::{self, LotView, Realization, Result};
use crate::model::{LotPick, Method, Portfolio};
use crate::money::{cents_str, qty_str, Decimal};
use crate::rules::{self, Term, WASH_WINDOW_DAYS};
use crate::simulate::{self, Cause, Proposal, SimulateInput};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanInput {
    pub portfolio: Portfolio,
    /// Last prices by symbol (options by their label, e.g. "NVDA 2026-12-18 150 C").
    #[serde(default)]
    pub prices: BTreeMap<String, Decimal>,
    /// "Today".
    pub date: Date,
}

fn price_of(prices: &BTreeMap<String, Decimal>, l: &LotView) -> Option<Decimal> {
    let key = if l.option.is_some() { l.label.clone() } else { l.symbol.clone() };
    prices.get(&key).or_else(|| prices.get(&key.to_lowercase())).copied()
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HarvestCandidate {
    pub lot_id: String,
    pub account: String,
    pub symbol: String,
    pub label: String,
    #[serde(with = "qty_str")]
    pub qty: Decimal,
    pub acquired: Date,
    pub holding_start: Date,
    pub term: Term,
    #[serde(with = "cents_str")]
    pub basis: Decimal,
    #[serde(with = "qty_str")]
    pub price: Decimal,
    #[serde(with = "cents_str")]
    pub value: Decimal,
    /// Unrealized loss (negative).
    #[serde(with = "cents_str")]
    pub unrealized: Decimal,
    /// Loss that would count if sold today (unrealized minus anything a wash sale disallows).
    #[serde(with = "cents_str")]
    pub recognized: Decimal,
    #[serde(with = "cents_str")]
    pub disallowed: Decimal,
    /// Estimated tax impact of harvesting it today (negative = saving).
    #[serde(with = "cents_str")]
    pub est_tax: Decimal,
    /// No wash sale: the whole loss is deductible.
    pub clean: bool,
    pub causes: Vec<Cause>,
    /// When every cause is an earlier purchase: the first day selling no longer washes.
    pub safe_from: Option<Date>,
    pub section1256: bool,
}

/// Every taxable lot with an unrealized loss, and whether selling it today would wash.
pub fn harvest(input: &ScanInput) -> Result<Vec<HarvestCandidate>> {
    let held = ledger::replay_until(&input.portfolio, Some(input.date))?;
    let mut out = vec![];
    for lot in held.lot_views() {
        let Some(account) = input.portfolio.account(&lot.account) else { continue };
        if account.kind.tax_advantaged() {
            continue;
        }
        let Some(price) = price_of(&input.prices, &lot) else { continue };
        let value = lot.qty * lot.multiplier * price;
        let exact_basis = held.lots.iter().find(|l| l.id == lot.id).map(|l| l.basis).unwrap_or(lot.basis);
        let unrealized = value - exact_basis;
        if unrealized >= Decimal::ZERO {
            continue;
        }
        let proposal = Proposal {
            account: lot.account.clone(),
            symbol: lot.symbol.clone(),
            qty: lot.qty,
            price,
            date: input.date,
            fees: Decimal::ZERO,
            option: lot.option.clone(),
            method: Some(Method::Specific),
            lots: Some(vec![LotPick { lot_id: lot.id.clone(), qty: None }]),
            rebuy: None,
        };
        let sim = simulate::simulate(&SimulateInput { portfolio: input.portfolio.clone(), proposal, prices: BTreeMap::new() });
        let (recognized, disallowed, est_tax, causes) = match sim {
            Ok(r) => (r.recognized, r.disallowed, r.est_tax, r.causes),
            // A later trade in the portfolio needs this lot; report the plain loss.
            Err(_) => (unrealized, Decimal::ZERO, Decimal::ZERO, vec![]),
        };
        let safe_from = (!causes.is_empty() && causes.iter().all(|c| c.before_sale))
            .then(|| causes.iter().map(|c| c.date).max().unwrap().add_days(WASH_WINDOW_DAYS + 1));
        out.push(HarvestCandidate {
            term: rules::term(lot.holding_start, input.date, lot.section1256),
            lot_id: lot.id,
            account: lot.account,
            symbol: lot.symbol,
            label: lot.label,
            qty: lot.qty,
            acquired: lot.acquired,
            holding_start: lot.holding_start,
            basis: exact_basis,
            price,
            value,
            unrealized,
            recognized,
            disallowed,
            est_tax,
            clean: disallowed.is_zero(),
            causes,
            safe_from,
            section1256: lot.section1256,
        });
    }
    out.sort_by(|a, b| a.recognized.cmp(&b.recognized).then(a.unrealized.cmp(&b.unrealized)));
    Ok(out)
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CountdownRow {
    pub lot_id: String,
    pub account: String,
    pub symbol: String,
    pub label: String,
    #[serde(with = "qty_str")]
    pub qty: Decimal,
    pub acquired: Date,
    pub holding_start: Date,
    pub long_term_from: Date,
    pub days_away: i32,
    #[serde(with = "cents_str")]
    pub basis: Decimal,
    pub price: Option<String>,
    /// Unrealized gain (null without a price).
    pub unrealized: Option<String>,
    /// Estimated tax saved by waiting until `longTermFrom` to sell a gain (0 for a loss).
    #[serde(with = "cents_str")]
    pub tax_saved_by_waiting: Decimal,
}

/// Open short-term lots in taxable accounts, soonest to go long-term first.
pub fn countdown(input: &ScanInput) -> Result<Vec<CountdownRow>> {
    let held = ledger::replay_until(&input.portfolio, Some(input.date))?;
    let s = &input.portfolio.settings;
    let mut out = vec![];
    for lot in held.lot_views() {
        let Some(account) = input.portfolio.account(&lot.account) else { continue };
        if account.kind.tax_advantaged() || lot.section1256 || input.date >= lot.long_term_from {
            continue;
        }
        let price = price_of(&input.prices, &lot);
        let unrealized = price.map(|p| lot.qty * lot.multiplier * p - lot.basis);
        let saved = unrealized.filter(|u| *u > Decimal::ZERO).map(|u| u * (s.st_rate - s.lt_rate)).unwrap_or_default();
        out.push(CountdownRow {
            days_away: input.date.days_until(lot.long_term_from),
            lot_id: lot.id,
            account: lot.account,
            symbol: lot.symbol,
            label: lot.label,
            qty: lot.qty,
            acquired: lot.acquired,
            holding_start: lot.holding_start,
            long_term_from: lot.long_term_from,
            basis: lot.basis,
            price: price.map(|p| p.normalize().to_string()),
            unrealized: unrealized.map(|u| {
                let mut c = crate::money::cents(u);
                c.rescale(2);
                c.to_string()
            }),
            tax_saved_by_waiting: saved,
        });
    }
    out.sort_by(|a, b| a.days_away.cmp(&b.days_away).then(a.lot_id.cmp(&b.lot_id)));
    Ok(out)
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummaryInput {
    pub portfolio: Portfolio,
    pub year: i32,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bucket {
    #[serde(with = "cents_str")]
    pub proceeds: Decimal,
    #[serde(with = "cents_str")]
    pub basis: Decimal,
    #[serde(with = "cents_str")]
    pub realized: Decimal,
    #[serde(with = "cents_str")]
    pub disallowed: Decimal,
    #[serde(with = "cents_str")]
    pub recognized: Decimal,
    pub count: usize,
}

impl Bucket {
    fn add(&mut self, r: &Realization) {
        self.proceeds += r.proceeds;
        self.basis += r.basis;
        self.realized += r.realized;
        self.disallowed += r.disallowed;
        self.recognized += r.recognized;
        self.count += 1;
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct YearSummary {
    pub year: i32,
    pub short_term: Bucket,
    pub long_term: Bucket,
    pub section1256: Bucket,
    /// Sales inside IRAs/Roths: realized but not taxed.
    pub tax_exempt: Bucket,
    #[serde(with = "cents_str")]
    pub disallowed_temporary: Decimal,
    #[serde(with = "cents_str")]
    pub disallowed_permanent: Decimal,
    /// Net short-term (incl. 40% of §1256) and long-term (incl. 60% of §1256).
    #[serde(with = "cents_str")]
    pub net_short: Decimal,
    #[serde(with = "cents_str")]
    pub net_long: Decimal,
    #[serde(with = "cents_str")]
    pub net: Decimal,
    /// Net loss deducted against ordinary income this year (≤ $3,000).
    #[serde(with = "cents_str")]
    pub deductible_loss: Decimal,
    #[serde(with = "cents_str")]
    pub carryforward: Decimal,
    #[serde(with = "cents_str")]
    pub est_tax: Decimal,
    pub realizations: Vec<Realization>,
}

/// Realized gains for one calendar year, netted the way Schedule D nets them (roughly).
pub fn year_summary(input: &SummaryInput) -> Result<YearSummary> {
    let l = ledger::replay(&input.portfolio)?;
    let s = &input.portfolio.settings;
    let rs: Vec<Realization> = l.realizations.into_iter().filter(|r| r.date.year() == input.year).collect();
    let (mut st, mut lt, mut s1256, mut exempt) = (Bucket::default(), Bucket::default(), Bucket::default(), Bucket::default());
    let (mut temp, mut perm) = (Decimal::ZERO, Decimal::ZERO);
    let (mut net_short, mut net_long) = (Decimal::ZERO, Decimal::ZERO);
    for r in &rs {
        if r.tax_exempt {
            exempt.add(r);
            continue;
        }
        match r.term {
            Term::Short => st.add(r),
            Term::Long => lt.add(r),
            Term::S1256 => s1256.add(r),
        }
        perm += r.disallowed_permanent;
        temp += r.disallowed - r.disallowed_permanent;
        net_short += r.short_term;
        net_long += r.long_term;
    }
    let (sr, lr) = (s.st_rate, s.lt_rate);
    let zero = Decimal::ZERO;
    // Net each side against the other; tax what's left; cap a net loss at $3,000.
    let (tax_st, tax_lt) = if net_short >= zero && net_long >= zero {
        (net_short, net_long)
    } else if net_short < zero && net_long >= zero {
        let rest = net_long + net_short;
        if rest >= zero {
            (zero, rest)
        } else {
            (rest, zero)
        }
    } else if net_long < zero && net_short >= zero {
        let rest = net_short + net_long;
        (rest, zero)
    } else {
        (net_short + net_long, zero)
    };
    let net = net_short + net_long;
    let (est_tax, deductible_loss, carryforward) = if tax_st + tax_lt < zero {
        let loss = -(tax_st + tax_lt);
        let cap = crate::money::dec("3000");
        let ded = crate::money::min(loss, cap);
        (-ded * sr, ded, loss - ded)
    } else {
        (tax_st * sr + tax_lt * lr, zero, zero)
    };
    Ok(YearSummary {
        year: input.year,
        short_term: st,
        long_term: lt,
        section1256: s1256,
        tax_exempt: exempt,
        disallowed_temporary: temp,
        disallowed_permanent: perm,
        net_short,
        net_long,
        net,
        deductible_loss,
        carryforward,
        est_tax,
        realizations: rs,
    })
}

/// Open lots as of a date (all trades when `as_of` is None), for positions views.
pub fn lots(portfolio: &Portfolio, as_of: Option<Date>) -> Result<Vec<LotView>> {
    Ok(ledger::replay_until(portfolio, as_of)?.lot_views())
}
