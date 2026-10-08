//! Inputs: accounts, trades, settings. Everything is camelCase JSON.

use crate::date::Date;
use crate::money::{dec, Decimal};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccountKind {
    Taxable,
    /// Traditional IRA (and similar tax-deferred accounts).
    Ira,
    Roth,
}

impl AccountKind {
    /// Sales inside are not taxed; a purchase inside makes a wash-sale loss permanent.
    pub fn tax_advantaged(self) -> bool {
        !matches!(self, AccountKind::Taxable)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default = "taxable")]
    pub kind: AccountKind,
}

fn taxable() -> AccountKind {
    AccountKind::Taxable
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Side {
    Buy,
    Sell,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OptionKind {
    Call,
    Put,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptionSpec {
    #[serde(rename = "type")]
    pub kind: OptionKind,
    #[serde(default = "hundred")]
    pub multiplier: Decimal,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub strike: Option<Decimal>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expiry: Option<Date>,
    /// A written (sold-to-open) put that is deep in the money: treated as a contract to acquire the
    /// stock, so it can be a wash-sale replacement. The engine can't price moneyness; the user flags it.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub deep_itm: bool,
}

fn hundred() -> Decimal {
    dec("100")
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Method {
    #[default]
    Fifo,
    Lifo,
    /// Highest cost per share first.
    Hifo,
    /// Lots named in `lots`.
    Specific,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LotPick {
    /// A lot id, or the id of the buy trade that opened it (matches all of its lots).
    pub lot_id: String,
    /// Units to take from this lot; the whole lot when omitted.
    #[serde(default)]
    pub qty: Option<Decimal>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Trade {
    pub id: String,
    pub account: String,
    pub date: Date,
    pub side: Side,
    pub symbol: String,
    /// Shares, or contracts for options.
    pub qty: Decimal,
    /// Per share (for options: per share of the underlying, as quoted).
    pub price: Decimal,
    #[serde(default)]
    pub fees: Decimal,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub option: Option<OptionSpec>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub method: Option<Method>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lots: Option<Vec<LotPick>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default = "st_rate")]
    pub st_rate: Decimal,
    #[serde(default = "lt_rate")]
    pub lt_rate: Decimal,
    #[serde(default)]
    pub method: Method,
}

fn st_rate() -> Decimal {
    dec("0.24")
}
fn lt_rate() -> Decimal {
    dec("0.15")
}

impl Default for Settings {
    fn default() -> Self {
        Settings { st_rate: st_rate(), lt_rate: lt_rate(), method: Method::Fifo }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Portfolio {
    #[serde(default = "one")]
    pub version: u32,
    pub accounts: Vec<Account>,
    pub trades: Vec<Trade>,
    #[serde(default)]
    pub settings: Settings,
}

fn one() -> u32 {
    1
}

impl Portfolio {
    pub fn account(&self, id: &str) -> Option<&Account> {
        self.accounts.iter().find(|a| a.id == id)
    }
}

/// What a trade is a trade *in*: a stock/ETF/index, or an option contract on one.
#[derive(Clone, Debug, PartialEq)]
pub struct Instrument {
    /// Uppercased underlying symbol.
    pub symbol: String,
    pub option: Option<OptionSpec>,
}

impl Instrument {
    pub fn of(t: &Trade) -> Instrument {
        Instrument { symbol: t.symbol.trim().to_uppercase(), option: t.option.clone() }
    }

    /// Units → share-equivalents (contracts × multiplier for options).
    pub fn multiplier(&self) -> Decimal {
        self.option.as_ref().map(|o| o.multiplier).unwrap_or(Decimal::ONE)
    }

    /// Identity for lot matching: same key = same position.
    pub fn key(&self) -> String {
        match &self.option {
            None => self.symbol.clone(),
            Some(o) => format!(
                "{} {} {} {}",
                self.symbol,
                o.expiry.map(|d| d.to_string()).unwrap_or_default(),
                o.strike.map(|s| s.normalize().to_string()).unwrap_or_default(),
                match o.kind {
                    OptionKind::Call => "C",
                    OptionKind::Put => "P",
                }
            ),
        }
    }

    /// Human label: "NVDA" or "NVDA 2026-12-18 150 C" (or "NVDA call" when strike/expiry are unknown).
    pub fn label(&self) -> String {
        match &self.option {
            Some(o) if o.strike.is_none() && o.expiry.is_none() => format!(
                "{} {}",
                self.symbol,
                match o.kind {
                    OptionKind::Call => "call",
                    OptionKind::Put => "put",
                }
            ),
            _ => self.key().split_whitespace().collect::<Vec<_>>().join(" "),
        }
    }

    pub fn is_section_1256(&self) -> bool {
        crate::rules::is_section_1256(&self.symbol)
    }
}
