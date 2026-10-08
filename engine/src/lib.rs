//! Lotwise tax-lot engine.
//!
//! US capital gains at "estimates, not tax advice" fidelity: tax lots per account, FIFO/LIFO/HIFO/
//! specific-lot sales, short vs long term, wash sales across every account (IRA replacements
//! disallow permanently; calls and flagged deep-ITM puts count), Section 1256 60/40, a pre-trade
//! receipt with coupons, harvest and long-term scans, and a year summary.
//!
//! See docs/PRODUCT_PLAN.md for the rules and the simplifications.

pub mod api;
pub mod date;
pub mod ledger;
pub mod model;
pub mod money;
pub mod rules;
pub mod scan;
pub mod simulate;
#[cfg(target_arch = "wasm32")]
pub mod wasm;
