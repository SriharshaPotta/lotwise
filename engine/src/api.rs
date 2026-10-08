//! JSON-in, JSON-out entry points. The wasm exports and the tests both go through these, so the
//! browser, Node (MCP server) and Rust see exactly the same behaviour.

use crate::date::Date;
use crate::ledger::{self, LotView, Realization};
use crate::model::Portfolio;
use crate::{rules, scan, simulate};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

pub type ApiResult = Result<String, String>;

fn parse<T: DeserializeOwned>(json: &str) -> Result<T, String> {
    serde_json::from_str(json).map_err(|e| format!("invalid input: {e}"))
}

fn emit<T: Serialize>(value: &T) -> ApiResult {
    serde_json::to_string(value).map_err(|e| e.to_string())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReplayInput {
    portfolio: Portfolio,
    #[serde(default)]
    as_of: Option<Date>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ReplayOutput {
    lots: Vec<LotView>,
    realizations: Vec<Realization>,
}

/// `{portfolio, asOf?}` → `{lots, realizations}`: open lots and every realized sale.
pub fn replay(json: &str) -> ApiResult {
    let input: ReplayInput = parse(json)?;
    let l = ledger::replay_until(&input.portfolio, input.as_of)?;
    emit(&ReplayOutput { lots: l.lot_views(), realizations: l.realizations })
}

/// `{portfolio, proposal, prices?}` → the pre-trade receipt.
pub fn simulate(json: &str) -> ApiResult {
    emit(&simulate::simulate(&parse(json)?)?)
}

/// The website's single-lot `SaleInput` → `SaleResult`.
pub fn simulate_lot_sale(json: &str) -> ApiResult {
    emit(&simulate::simulate_lot_sale(&parse(json)?)?)
}

/// `{portfolio, prices, date}` → harvestable losses.
pub fn harvest_scan(json: &str) -> ApiResult {
    emit(&scan::harvest(&parse(json)?)?)
}

/// `{portfolio, prices?, date}` → short-term lots and days until long-term.
pub fn countdown(json: &str) -> ApiResult {
    emit(&scan::countdown(&parse(json)?)?)
}

/// `{portfolio, year}` → realized summary for the year.
pub fn year_summary(json: &str) -> ApiResult {
    emit(&scan::year_summary(&parse(json)?)?)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Info {
    version: &'static str,
    wash_window_days: i32,
    section1256_symbols: &'static [&'static str],
}

/// Engine version and rule constants.
pub fn info() -> String {
    serde_json::to_string(&Info {
        version: env!("CARGO_PKG_VERSION"),
        wash_window_days: rules::WASH_WINDOW_DAYS,
        section1256_symbols: rules::SECTION_1256_SYMBOLS,
    })
    .unwrap()
}
