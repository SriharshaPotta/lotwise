//! The pre-trade receipt: what a proposed sale (and optional rebuy) would do, and what to do instead.

use crate::date::Date;
use crate::ledger::{self, term_of, Realization, Result, WashMatch};
use crate::model::{Account, AccountKind, Instrument, LotPick, Method, OptionSpec, Portfolio, Settings, Side, Trade};
use crate::money::{cents_str, qty_str, Decimal};
use crate::rules::WASH_WINDOW_DAYS;
use crate::scan;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const SALE_ID: &str = "__sale";
pub const REBUY_ID: &str = "__rebuy";

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Proposal {
    pub account: String,
    pub symbol: String,
    pub qty: Decimal,
    pub price: Decimal,
    pub date: Date,
    #[serde(default)]
    pub fees: Decimal,
    #[serde(default)]
    pub option: Option<OptionSpec>,
    #[serde(default)]
    pub method: Option<Method>,
    #[serde(default)]
    pub lots: Option<Vec<LotPick>>,
    #[serde(default)]
    pub rebuy: Option<Rebuy>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rebuy {
    pub date: Date,
    /// Defaults to the sale's account.
    #[serde(default)]
    pub account: Option<String>,
    /// Defaults to the sale's quantity.
    #[serde(default)]
    pub qty: Option<Decimal>,
    /// Defaults to the sale's price.
    #[serde(default)]
    pub price: Option<Decimal>,
    #[serde(default)]
    pub option: Option<OptionSpec>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulateInput {
    pub portfolio: Portfolio,
    pub proposal: Proposal,
    /// Last prices by symbol, for the "harvest X instead" coupon.
    #[serde(default)]
    pub prices: BTreeMap<String, Decimal>,
}

/// One purchase behind a disallowed loss, summed over the lots sold.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Cause {
    pub trade_id: String,
    pub account: String,
    pub account_kind: AccountKind,
    pub date: Date,
    pub symbol: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub option: Option<OptionSpec>,
    /// Units of the purchase (shares or contracts), from the portfolio.
    #[serde(with = "qty_str")]
    pub qty: Decimal,
    /// Share-equivalents matched against this sale.
    #[serde(with = "qty_str")]
    pub shares: Decimal,
    #[serde(with = "cents_str")]
    pub disallowed: Decimal,
    pub permanent: bool,
    pub before_sale: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RebuyOutcome {
    pub date: Date,
    pub account: String,
    #[serde(with = "qty_str")]
    pub qty: Decimal,
    /// The rebuy washes (part of) this sale's loss.
    pub triggers: bool,
    #[serde(with = "cents_str")]
    pub disallowed: Decimal,
    pub permanent: bool,
    /// First rebuy date that would not wash.
    pub safe_from: Date,
    /// Total basis of the rebought shares, including any disallowed loss added to it.
    #[serde(with = "cents_str")]
    pub replacement_basis: Decimal,
    /// Holding period start of the (adjusted) rebought shares.
    pub holding_start: Date,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Coupon {
    /// Sell on/after `date` to get long-term treatment; saves `saves` in estimated tax.
    #[serde(rename_all = "camelCase")]
    LongTerm {
        date: Date,
        days_away: i32,
        #[serde(with = "cents_str")]
        saves: Decimal,
    },
    /// Sell on/after `date` (31 days after the last earlier purchase) to keep the deduction.
    #[serde(rename_all = "camelCase")]
    AvoidWash {
        date: Date,
        #[serde(with = "cents_str")]
        keeps: Decimal,
    },
    /// Rebuy on/after `date` instead.
    #[serde(rename_all = "camelCase")]
    SafeRebuy {
        date: Date,
        #[serde(with = "cents_str")]
        keeps: Decimal,
    },
    /// Harvest a different lot that has a clean loss.
    #[serde(rename_all = "camelCase")]
    HarvestInstead {
        lot_id: String,
        account: String,
        symbol: String,
        #[serde(with = "qty_str")]
        qty: Decimal,
        /// Recognized (negative) loss.
        #[serde(with = "cents_str")]
        loss: Decimal,
        #[serde(with = "cents_str")]
        est_tax: Decimal,
    },
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Receipt {
    pub account: String,
    pub symbol: String,
    pub label: String,
    #[serde(with = "qty_str")]
    pub qty: Decimal,
    #[serde(with = "qty_str")]
    pub price: Decimal,
    pub date: Date,
    #[serde(with = "cents_str")]
    pub proceeds: Decimal,
    #[serde(with = "cents_str")]
    pub basis: Decimal,
    #[serde(with = "cents_str")]
    pub realized: Decimal,
    /// "short", "long", "1256" or "mixed".
    pub term: &'static str,
    #[serde(with = "cents_str")]
    pub disallowed: Decimal,
    #[serde(with = "cents_str")]
    pub disallowed_permanent: Decimal,
    #[serde(with = "cents_str")]
    pub recognized: Decimal,
    /// Loss you can actually deduct this year (positive), 0 for a gain.
    #[serde(with = "cents_str")]
    pub deductible: Decimal,
    #[serde(with = "cents_str")]
    pub short_term: Decimal,
    #[serde(with = "cents_str")]
    pub long_term: Decimal,
    #[serde(with = "cents_str")]
    pub est_tax: Decimal,
    pub tax_exempt: bool,
    /// Wash sale caused by purchases already in the portfolio (before or after the sale).
    pub causes: Vec<Cause>,
    pub rebuy: Option<RebuyOutcome>,
    pub lots: Vec<Realization>,
    pub coupons: Vec<Coupon>,
}

fn sale_trade(p: &Proposal, date: Date) -> Trade {
    Trade {
        id: SALE_ID.into(),
        account: p.account.clone(),
        date,
        side: Side::Sell,
        symbol: p.symbol.clone(),
        qty: p.qty,
        price: p.price,
        fees: p.fees,
        option: p.option.clone(),
        method: p.method,
        lots: p.lots.clone(),
    }
}

fn rebuy_trade(p: &Proposal, r: &Rebuy, date: Date) -> Trade {
    Trade {
        id: REBUY_ID.into(),
        account: r.account.clone().unwrap_or_else(|| p.account.clone()),
        date,
        side: Side::Buy,
        symbol: p.symbol.clone(),
        qty: r.qty.unwrap_or(p.qty),
        price: r.price.unwrap_or(p.price),
        fees: Decimal::ZERO,
        option: r.option.clone().or_else(|| p.option.clone()),
        method: None,
        lots: None,
    }
}

struct Run {
    ledger: ledger::Ledger,
}

impl Run {
    fn pieces(&self) -> Vec<&Realization> {
        self.ledger.realizations.iter().filter(|r| r.sale_id == SALE_ID).collect()
    }
    fn total(&self, f: impl Fn(&Realization) -> Decimal) -> Decimal {
        self.pieces().into_iter().map(f).sum()
    }
    fn matches(&self) -> impl Iterator<Item = &WashMatch> {
        self.ledger.realizations.iter().filter(|r| r.sale_id == SALE_ID).flat_map(|r| r.wash.iter())
    }
}

fn run(portfolio: &Portfolio, proposal: &Proposal, date: Date, rebuy_date: Option<Option<Date>>) -> Result<Run> {
    let mut p = portfolio.clone();
    p.trades.push(sale_trade(proposal, date));
    if let Some(r) = &proposal.rebuy {
        let rd = rebuy_date.unwrap_or(Some(r.date));
        if let Some(rd) = rd {
            if r.qty.is_none_or(|q| q > Decimal::ZERO) {
                p.trades.push(rebuy_trade(proposal, r, rd));
            }
        }
    }
    if p.trades.iter().filter(|t| t.id == SALE_ID || t.id == REBUY_ID).count() > 2 {
        return Err("portfolio trade ids may not start with __".into());
    }
    Ok(Run { ledger: ledger::replay(&p)? })
}

pub fn simulate(input: &SimulateInput) -> Result<Receipt> {
    let SimulateInput { portfolio, proposal, prices } = input;
    let date = proposal.date;
    let now = run(portfolio, proposal, date, None)?;
    let pieces = now.pieces();
    let instrument = Instrument { symbol: proposal.symbol.trim().to_uppercase(), option: proposal.option.clone() };

    // Causes, by purchase, excluding the hypothetical rebuy.
    let mut causes: Vec<Cause> = vec![];
    let mut rebuy_disallowed = Decimal::ZERO;
    let mut rebuy_permanent = false;
    for m in now.matches() {
        if m.trade_id == REBUY_ID {
            rebuy_disallowed += m.disallowed;
            rebuy_permanent |= m.permanent;
            continue;
        }
        match causes.iter_mut().find(|c| c.trade_id == m.trade_id) {
            Some(c) => {
                c.shares += m.shares;
                c.disallowed += m.disallowed;
            }
            None => causes.push(Cause {
                trade_id: m.trade_id.clone(),
                account: m.account.clone(),
                account_kind: m.account_kind,
                date: m.date,
                symbol: m.symbol.clone(),
                label: m.label.clone(),
                option: m.option.clone(),
                qty: portfolio.trades.iter().find(|t| t.id == m.trade_id).map(|t| t.qty).unwrap_or_default(),
                shares: m.shares,
                disallowed: m.disallowed,
                permanent: m.permanent,
                before_sale: m.before_sale,
            }),
        }
    }

    let rebuy = proposal.rebuy.as_ref().map(|r| {
        let lots: Vec<_> = now.ledger.lots.iter().filter(|l| l.trade_id == REBUY_ID).collect();
        let replacement_basis = lots.iter().map(|l| l.basis).sum();
        let holding_start = lots.iter().map(|l| l.holding_start).min().unwrap_or(r.date);
        RebuyOutcome {
            date: r.date,
            account: r.account.clone().unwrap_or_else(|| proposal.account.clone()),
            qty: r.qty.unwrap_or(proposal.qty),
            triggers: rebuy_disallowed > Decimal::ZERO,
            disallowed: rebuy_disallowed,
            permanent: rebuy_permanent,
            safe_from: date.add_days(WASH_WINDOW_DAYS + 1),
            replacement_basis,
            holding_start,
        }
    });

    let realized = now.total(|r| r.realized);
    let disallowed = now.total(|r| r.disallowed);
    let recognized = now.total(|r| r.recognized);
    let est_tax = now.total(|r| r.est_tax);
    let tax_exempt = pieces.iter().all(|r| r.tax_exempt) && !pieces.is_empty();

    // Coupons.
    let mut coupons = vec![];
    let short_gain_lots: Vec<&&Realization> =
        pieces.iter().filter(|r| r.term == crate::rules::Term::Short && r.realized > Decimal::ZERO).collect();
    if !tax_exempt && !short_gain_lots.is_empty() {
        let lt_date = short_gain_lots.iter().map(|r| r.holding_start.long_term_from()).max().unwrap();
        if let Ok(later) = run(portfolio, proposal, lt_date, Some(None)) {
            let saves = est_tax - later.total(|r| r.est_tax);
            if saves > Decimal::ZERO {
                coupons.push(Coupon::LongTerm { date: lt_date, days_away: date.days_until(lt_date), saves });
            }
        }
    }
    let prior: Vec<&Cause> = causes.iter().filter(|c| c.disallowed > Decimal::ZERO).collect();
    if !prior.is_empty() && prior.iter().all(|c| c.before_sale) {
        let safe = prior.iter().map(|c| c.date).max().unwrap().add_days(WASH_WINDOW_DAYS + 1);
        if let Ok(later) = run(portfolio, proposal, safe, Some(None)) {
            if later.matches().all(|m| m.disallowed.is_zero()) {
                let keeps: Decimal = prior.iter().map(|c| c.disallowed).sum();
                coupons.push(Coupon::AvoidWash { date: safe, keeps });
            }
        }
    }
    if rebuy_disallowed > Decimal::ZERO {
        coupons.push(Coupon::SafeRebuy { date: date.add_days(WASH_WINDOW_DAYS + 1), keeps: rebuy_disallowed });
    }
    if disallowed > Decimal::ZERO && !prices.is_empty() {
        let scan_in = scan::ScanInput { portfolio: portfolio.clone(), prices: prices.clone(), date };
        if let Ok(cands) = scan::harvest(&scan_in) {
            if let Some(c) = cands
                .iter()
                .filter(|c| c.clean && c.symbol != instrument.symbol && c.recognized < Decimal::ZERO)
                .min_by(|a, b| a.recognized.cmp(&b.recognized))
            {
                coupons.push(Coupon::HarvestInstead {
                    lot_id: c.lot_id.clone(),
                    account: c.account.clone(),
                    symbol: c.symbol.clone(),
                    qty: c.qty,
                    loss: c.recognized,
                    est_tax: c.est_tax,
                });
            }
        }
    }

    Ok(Receipt {
        account: proposal.account.clone(),
        symbol: instrument.symbol.clone(),
        label: instrument.label(),
        qty: proposal.qty,
        price: proposal.price,
        date,
        proceeds: now.total(|r| r.proceeds),
        basis: now.total(|r| r.basis),
        realized,
        term: term_of(&pieces),
        disallowed,
        disallowed_permanent: now.total(|r| r.disallowed_permanent),
        recognized,
        deductible: if recognized < Decimal::ZERO { -recognized } else { Decimal::ZERO },
        short_term: now.total(|r| r.short_term),
        long_term: now.total(|r| r.long_term),
        est_tax,
        tax_exempt,
        causes,
        rebuy,
        lots: pieces.into_iter().cloned().collect(),
        coupons,
    })
}

// ---------------------------------------------------------------------------------------------
// The website's original single-lot interface (lib/engine/types.ts `SaleInput` → `SaleResult`).

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimpleLot {
    pub id: String,
    pub account: String,
    pub symbol: String,
    pub qty: Decimal,
    pub cost_per_share: Decimal,
    pub acquired: Date,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimpleRebuy {
    pub date: Date,
    pub qty: Decimal,
    pub price: Decimal,
    pub account: String,
    #[serde(default)]
    pub is_ira: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rates {
    pub st: Decimal,
    pub lt: Decimal,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleInput {
    pub lot: SimpleLot,
    pub qty: Decimal,
    pub price: Decimal,
    pub date: Date,
    #[serde(default)]
    pub rebuy: Option<SimpleRebuy>,
    #[serde(default)]
    pub tax_rates: Option<Rates>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SimpleWash {
    #[serde(with = "cents_str")]
    pub disallowed: Decimal,
    #[serde(with = "cents_str")]
    pub replacement_basis: Decimal,
    pub holding_start: Date,
    pub permanent: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleResult {
    #[serde(with = "cents_str")]
    pub realized: Decimal,
    pub term: &'static str,
    #[serde(with = "cents_str")]
    pub est_tax: Decimal,
    pub wash: Option<SimpleWash>,
}

/// One lot, one sale, an optional rebuy: the receipt the marketing explainers print.
pub fn simulate_lot_sale(input: &SaleInput) -> Result<SaleResult> {
    let lot = &input.lot;
    if input.qty <= Decimal::ZERO || input.qty > lot.qty {
        return Err(format!("qty must be in 1..{}, got {}", lot.qty.normalize(), input.qty.normalize()));
    }
    let mut accounts = vec![Account { id: lot.account.clone(), name: lot.account.clone(), kind: AccountKind::Taxable }];
    let rebuy = input.rebuy.as_ref().filter(|r| r.qty > Decimal::ZERO);
    if let Some(r) = rebuy {
        let kind = if r.is_ira { AccountKind::Ira } else { AccountKind::Taxable };
        match accounts.iter_mut().find(|a| a.id == r.account) {
            Some(a) => a.kind = if r.is_ira { AccountKind::Ira } else { a.kind },
            None => accounts.push(Account { id: r.account.clone(), name: r.account.clone(), kind }),
        }
    }
    let mut settings = Settings::default();
    if let Some(r) = &input.tax_rates {
        settings.st_rate = r.st;
        settings.lt_rate = r.lt;
    }
    let buy = Trade {
        id: lot.id.clone(),
        account: lot.account.clone(),
        date: lot.acquired,
        side: Side::Buy,
        symbol: lot.symbol.clone(),
        qty: lot.qty,
        price: lot.cost_per_share,
        fees: Decimal::ZERO,
        option: None,
        method: None,
        lots: None,
    };
    let portfolio = Portfolio { version: 1, accounts, trades: vec![buy], settings };
    let proposal = Proposal {
        account: lot.account.clone(),
        symbol: lot.symbol.clone(),
        qty: input.qty,
        price: input.price,
        date: input.date,
        fees: Decimal::ZERO,
        option: None,
        method: Some(Method::Specific),
        lots: Some(vec![LotPick { lot_id: lot.id.clone(), qty: None }]),
        rebuy: rebuy.map(|r| Rebuy {
            date: r.date,
            account: Some(r.account.clone()),
            qty: Some(r.qty),
            price: Some(r.price),
            option: None,
        }),
    };
    let now = run(&portfolio, &proposal, input.date, None)?;
    let pieces = now.pieces();
    let disallowed = now.total(|r| r.disallowed);
    let wash = (disallowed > Decimal::ZERO).then(|| {
        let lots: Vec<_> = now.ledger.lots.iter().filter(|l| l.trade_id == REBUY_ID).collect();
        let adjusted: Vec<_> = lots.iter().filter(|l| l.replacement).collect();
        SimpleWash {
            disallowed,
            replacement_basis: lots.iter().map(|l| l.basis).sum(),
            holding_start: adjusted.iter().map(|l| l.holding_start).min().unwrap_or(input.date),
            permanent: now.matches().any(|m| m.permanent),
        }
    });
    Ok(SaleResult {
        realized: now.total(|r| r.realized),
        term: if pieces.iter().any(|r| r.term == crate::rules::Term::Long) { "long" } else { "short" },
        est_tax: now.total(|r| r.est_tax),
        wash,
    })
}
