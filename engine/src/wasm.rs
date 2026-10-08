//! wasm-bindgen exports. Every function takes and returns a JSON string; errors throw.

use crate::api;
use wasm_bindgen::prelude::*;

fn js(r: api::ApiResult) -> Result<String, JsError> {
    r.map_err(|e| JsError::new(&e))
}

#[wasm_bindgen]
pub fn info() -> String {
    api::info()
}

#[wasm_bindgen]
pub fn replay(json: &str) -> Result<String, JsError> {
    js(api::replay(json))
}

#[wasm_bindgen]
pub fn simulate(json: &str) -> Result<String, JsError> {
    js(api::simulate(json))
}

#[wasm_bindgen(js_name = simulateLotSale)]
pub fn simulate_lot_sale(json: &str) -> Result<String, JsError> {
    js(api::simulate_lot_sale(json))
}

#[wasm_bindgen(js_name = harvestScan)]
pub fn harvest_scan(json: &str) -> Result<String, JsError> {
    js(api::harvest_scan(json))
}

#[wasm_bindgen]
pub fn countdown(json: &str) -> Result<String, JsError> {
    js(api::countdown(json))
}

#[wasm_bindgen(js_name = yearSummary)]
pub fn year_summary(json: &str) -> Result<String, JsError> {
    js(api::year_summary(json))
}
