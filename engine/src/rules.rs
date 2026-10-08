//! Small tax rules shared by the ledger, the simulator and the scans.

use crate::date::Date;
use crate::model::{Instrument, OptionKind};
use crate::money::{dec, Decimal};
use serde::Serialize;

pub const WASH_WINDOW_DAYS: i32 = 30;

/// Broad-based index products taxed under IRC §1256 (60/40, no wash sales). Options on these
/// symbols qualify; options on ETFs that track them (SPY, QQQ, IWM) do not.
pub const SECTION_1256_SYMBOLS: &[&str] =
    &["SPX", "SPXW", "XSP", "NDX", "NDXP", "XND", "RUT", "RUTW", "MRUT", "VIX", "VIXW", "OEX", "XEO", "DJX"];

pub fn is_section_1256(symbol: &str) -> bool {
    let s = symbol.trim().to_uppercase();
    SECTION_1256_SYMBOLS.contains(&s.as_str())
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Term {
    Short,
    Long,
    /// Section 1256: 60% long / 40% short regardless of holding period.
    #[serde(rename = "1256")]
    S1256,
}

pub fn term(holding_start: Date, sale: Date, is_1256: bool) -> Term {
    if is_1256 {
        Term::S1256
    } else if sale > holding_start.anniversary() {
        Term::Long
    } else {
        Term::Short
    }
}

/// Splits a recognized gain into (short-term, long-term) parts.
pub fn split_by_term(recognized: Decimal, term: Term) -> (Decimal, Decimal) {
    match term {
        Term::Short => (recognized, Decimal::ZERO),
        Term::Long => (Decimal::ZERO, recognized),
        Term::S1256 => {
            let lt = recognized * dec("0.6");
            (recognized - lt, lt)
        }
    }
}

/// Whether buying `candidate` acquires something substantially identical to `sold`.
/// Same stock; a call on the same stock; a deep-in-the-money written put (flagged) on it.
/// Option losses only wash against the same contract.
pub fn substantially_identical(sold: &Instrument, candidate: &Instrument) -> bool {
    if sold.symbol != candidate.symbol {
        return false;
    }
    match (&sold.option, &candidate.option) {
        (None, None) => true,
        (None, Some(o)) => o.kind == OptionKind::Call || o.deep_itm,
        (Some(_), _) => sold.key() == candidate.key(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::date::d;
    use crate::model::OptionSpec;

    fn stock(s: &str) -> Instrument {
        Instrument { symbol: s.into(), option: None }
    }
    fn opt(s: &str, kind: OptionKind, deep_itm: bool) -> Instrument {
        Instrument { symbol: s.into(), option: Some(OptionSpec { kind, multiplier: dec("100"), strike: None, expiry: None, deep_itm }) }
    }

    #[test]
    fn term_boundaries() {
        let start = d("2025-10-23");
        assert_eq!(term(start, d("2026-10-23"), false), Term::Short); // exactly one year: still short
        assert_eq!(term(start, d("2026-10-24"), false), Term::Long);
        assert_eq!(term(d("2024-02-29"), d("2025-02-28"), false), Term::Short);
        assert_eq!(term(d("2024-02-29"), d("2025-03-01"), false), Term::Long);
        assert_eq!(term(d("2026-10-01"), d("2026-10-02"), true), Term::S1256);
    }

    #[test]
    fn s1256_split_is_60_40() {
        assert_eq!(split_by_term(dec("1000"), Term::S1256), (dec("400"), dec("600")));
        assert!(is_section_1256("xsp"));
        assert!(!is_section_1256("SPY"));
    }

    #[test]
    fn identical() {
        assert!(substantially_identical(&stock("NVDA"), &stock("NVDA")));
        assert!(!substantially_identical(&stock("NVDA"), &stock("AMD")));
        assert!(!substantially_identical(&stock("VOO"), &stock("IVV")));
        assert!(substantially_identical(&stock("NVDA"), &opt("NVDA", OptionKind::Call, false)));
        assert!(!substantially_identical(&stock("NVDA"), &opt("NVDA", OptionKind::Put, false)));
        assert!(substantially_identical(&stock("NVDA"), &opt("NVDA", OptionKind::Put, true)));
        assert!(!substantially_identical(&opt("NVDA", OptionKind::Call, false), &stock("NVDA")));
    }
}
