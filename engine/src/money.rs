//! Money and quantities are exact decimals. They cross the JSON boundary as strings ("148.20");
//! numbers are accepted on input too.

pub use rust_decimal::Decimal;
use rust_decimal::RoundingStrategy;

/// Rounds to cents, half away from zero.
pub fn cents(x: Decimal) -> Decimal {
    let r = x.round_dp_with_strategy(2, RoundingStrategy::MidpointAwayFromZero);
    if r.is_zero() {
        Decimal::ZERO // normalizes -0.00
    } else {
        r
    }
}

/// Parses a decimal literal; panics on bad input. For tests and constants.
pub fn dec(s: &str) -> Decimal {
    s.parse().unwrap()
}

pub fn min(a: Decimal, b: Decimal) -> Decimal {
    if a < b {
        a
    } else {
        b
    }
}

/// Serde helpers that serialize money rounded to cents (as a string with two decimals).
pub mod cents_str {
    use super::*;
    use serde::Serializer;

    pub fn serialize<S: Serializer>(x: &Decimal, s: S) -> Result<S::Ok, S::Error> {
        let mut c = cents(*x);
        c.rescale(2);
        s.collect_str(&c)
    }
}

/// Serializes a quantity without trailing zeros ("100", "0.5").
pub mod qty_str {
    use super::*;
    use serde::Serializer;

    pub fn serialize<S: Serializer>(x: &Decimal, s: S) -> Result<S::Ok, S::Error> {
        s.collect_str(&x.normalize())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rounds_half_away_from_zero() {
        assert_eq!(cents(dec("1.005")), dec("1.01"));
        assert_eq!(cents(dec("-1.005")), dec("-1.01"));
        assert_eq!(cents(dec("-0.001")).to_string(), "0");
        assert_eq!(cents(dec("129.8") * dec("100") - dec("14820")), dec("-1840"));
    }
}
