//! Civil calendar dates (proleptic Gregorian), stored as days since 1970-01-01.
//!
//! Only what tax-lot math needs: parsing ISO `YYYY-MM-DD`, day arithmetic, month arithmetic that
//! clamps to month end, and the one-year anniversary used for the long-term test.

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt;

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Date {
    days: i32,
}

fn is_leap(y: i32) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}

fn days_in_month(y: i32, m: u32) -> u32 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        _ if is_leap(y) => 29,
        _ => 28,
    }
}

// Howard Hinnant's days_from_civil / civil_from_days.
fn days_from_civil(y: i32, m: u32, d: u32) -> i32 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let m = m as i32;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d as i32 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

fn civil_from_days(z: i32) -> (i32, u32, u32) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

impl Date {
    pub fn from_ymd(y: i32, m: u32, d: u32) -> Option<Date> {
        if !(1..=12).contains(&m) || d == 0 || d > days_in_month(y, m) {
            return None;
        }
        Some(Date { days: days_from_civil(y, m, d) })
    }

    pub fn ymd(self) -> (i32, u32, u32) {
        civil_from_days(self.days)
    }

    pub fn year(self) -> i32 {
        self.ymd().0
    }

    pub fn parse(s: &str) -> Result<Date, String> {
        let bad = || format!("invalid date {s:?}; expected YYYY-MM-DD");
        let s = s.trim();
        let s = s.get(..10).filter(|_| s.len() == 10 || s.as_bytes().get(10) == Some(&b'T')).ok_or_else(bad)?;
        let mut it = s.split('-');
        let (y, m, d) = (it.next(), it.next(), it.next());
        match (y, m, d, it.next()) {
            (Some(y), Some(m), Some(d), None) if y.len() == 4 && m.len() == 2 && d.len() == 2 => {
                let y: i32 = y.parse().map_err(|_| bad())?;
                let m: u32 = m.parse().map_err(|_| bad())?;
                let d: u32 = d.parse().map_err(|_| bad())?;
                Date::from_ymd(y, m, d).ok_or_else(bad)
            }
            _ => Err(bad()),
        }
    }

    pub fn add_days(self, n: i32) -> Date {
        Date { days: self.days + n }
    }

    /// Whole days from `self` to `other` (positive when `other` is later).
    pub fn days_until(self, other: Date) -> i32 {
        other.days - self.days
    }

    /// Adds calendar months, clamping to the last day of the target month (Jan 31 + 1 → Feb 28/29).
    pub fn add_months(self, n: i32) -> Date {
        let (y, m, d) = self.ymd();
        let total = y * 12 + (m as i32 - 1) + n;
        let (ty, tm) = (total.div_euclid(12), total.rem_euclid(12) as u32 + 1);
        let td = d.min(days_in_month(ty, tm));
        Date::from_ymd(ty, tm, td).expect("clamped date is valid")
    }

    /// The one-year anniversary of a holding that started on `self`. A Feb 29 start's anniversary is
    /// Feb 28 of the next year (month-end rule).
    pub fn anniversary(self) -> Date {
        self.add_months(12)
    }

    /// First sale date that counts as long-term ("held more than one year").
    pub fn long_term_from(self) -> Date {
        self.anniversary().add_days(1)
    }
}

impl fmt::Display for Date {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let (y, m, d) = self.ymd();
        write!(f, "{y:04}-{m:02}-{d:02}")
    }
}

impl fmt::Debug for Date {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::Display::fmt(self, f)
    }
}

impl Serialize for Date {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.collect_str(self)
    }
}

impl<'de> Deserialize<'de> for Date {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let s = String::deserialize(d)?;
        Date::parse(&s).map_err(serde::de::Error::custom)
    }
}

/// Shorthand for tests and fixtures: panics on a bad literal.
pub fn d(s: &str) -> Date {
    Date::parse(s).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_and_epoch() {
        assert_eq!(d("1970-01-01").days, 0);
        for s in ["2000-02-29", "2024-02-29", "1999-12-31", "2026-10-15", "1900-03-01", "2100-02-28"] {
            assert_eq!(d(s).to_string(), s);
        }
        assert_eq!(d("2026-10-15T12:00:00Z").to_string(), "2026-10-15");
    }

    #[test]
    fn rejects_bad_dates() {
        for s in ["2025-02-29", "2026-13-01", "2026-00-10", "2026-1-5", "20261015", "", "2026-04-31"] {
            assert!(Date::parse(s).is_err(), "{s}");
        }
    }

    #[test]
    fn day_arithmetic() {
        assert_eq!(d("2026-10-15").add_days(31).to_string(), "2026-11-15");
        assert_eq!(d("2026-10-03").add_days(31).to_string(), "2026-11-03");
        assert_eq!(d("2024-02-28").add_days(1).to_string(), "2024-02-29");
        assert_eq!(d("2026-03-12").days_until(d("2026-10-15")), 217);
        assert_eq!(d("2026-10-15").days_until(d("2026-10-03")), -12);
    }

    #[test]
    fn month_arithmetic_clamps() {
        assert_eq!(d("2026-01-31").add_months(1).to_string(), "2026-02-28");
        assert_eq!(d("2024-01-31").add_months(1).to_string(), "2024-02-29");
        assert_eq!(d("2026-12-15").add_months(1).to_string(), "2027-01-15");
        assert_eq!(d("2026-01-15").add_months(-1).to_string(), "2025-12-15");
    }

    #[test]
    fn anniversary_and_leap_day() {
        assert_eq!(d("2025-10-23").long_term_from().to_string(), "2026-10-24");
        // Bought on leap day: anniversary Feb 28 2025, long-term from Mar 1 2025.
        assert_eq!(d("2024-02-29").anniversary().to_string(), "2025-02-28");
        assert_eq!(d("2024-02-29").long_term_from().to_string(), "2025-03-01");
        // Bought Feb 28 2023: anniversary Feb 28 2024 (not the 29th), long-term from Feb 29 2024.
        assert_eq!(d("2023-02-28").long_term_from().to_string(), "2024-02-29");
        // Bought Mar 1 2023: long-term from Mar 2 2024.
        assert_eq!(d("2023-03-01").long_term_from().to_string(), "2024-03-02");
    }
}
