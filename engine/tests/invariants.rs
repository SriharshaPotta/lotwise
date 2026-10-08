//! Properties that must hold for any trade history, checked over pseudo-random portfolios.

use lotwise_engine::date::d;
use lotwise_engine::ledger::replay;
use lotwise_engine::model::{Account, AccountKind, Portfolio, Settings, Side, Trade};
use lotwise_engine::money::{cents, Decimal};

struct Lcg(u64);
impl Lcg {
    fn next(&mut self, n: u64) -> u64 {
        self.0 = self.0.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        (self.0 >> 33) % n
    }
}

fn portfolio(seed: u64, with_ira: bool) -> Portfolio {
    let mut r = Lcg(seed);
    let accounts = vec![
        Account { id: "a".into(), name: "A".into(), kind: AccountKind::Taxable },
        Account { id: "b".into(), name: "B".into(), kind: AccountKind::Taxable },
        Account { id: "ira".into(), name: "IRA".into(), kind: AccountKind::Roth },
    ];
    let mut held = std::collections::HashMap::<(String, String), i64>::new();
    let mut trades = vec![];
    let mut date = d("2025-01-02");
    for i in 0..60 {
        date = date.add_days(r.next(9) as i32);
        let acct = ["a", "b", "ira"][r.next(if with_ira { 3 } else { 2 }) as usize].to_string();
        let sym = ["AAA", "BBB"][r.next(2) as usize].to_string();
        let price = Decimal::from(40 + r.next(40) as i64) + Decimal::new(r.next(100) as i64, 2);
        let h = held.entry((acct.clone(), sym.clone())).or_default();
        let (side, qty) = if *h > 0 && r.next(2) == 0 {
            let q = 1 + r.next(*h as u64) as i64;
            *h -= q;
            (Side::Sell, q)
        } else {
            let q = 1 + r.next(50) as i64;
            *h += q;
            (Side::Buy, q)
        };
        trades.push(Trade {
            id: format!("t{i}"),
            account: acct,
            date,
            side,
            symbol: sym,
            qty: Decimal::from(qty),
            price,
            fees: Decimal::ZERO,
            option: None,
            method: None,
            lots: None,
        });
    }
    Portfolio { version: 1, accounts, trades, settings: Settings::default() }
}

/// Every dollar of disallowed loss is either recognized later or still sitting in an open lot's basis; nothing is
/// created or lost (all-taxable accounts).
#[test]
fn disallowed_losses_are_conserved() {
    for seed in 0..200 {
        let p = portfolio(seed, false);
        let l = replay(&p).unwrap();
        let purchases: Decimal = p.trades.iter().filter(|t| t.side == Side::Buy).map(|t| t.qty * t.price).sum();
        let proceeds: Decimal = p.trades.iter().filter(|t| t.side == Side::Sell).map(|t| t.qty * t.price).sum();
        let open_cost: Decimal = l.lots.iter().map(|x| x.basis - x.wash_adjustment).sum();
        let open_adj: Decimal = l.lots.iter().map(|x| x.wash_adjustment).sum();
        let recognized: Decimal = l.realizations.iter().map(|r| r.recognized).sum();
        let economic = proceeds - (purchases - open_cost);
        assert_eq!(cents(recognized - open_adj), cents(economic), "seed {seed}");
        let shares: Decimal = l.lots.iter().map(|x| x.qty).sum();
        let bought: Decimal = p.trades.iter().filter(|t| t.side == Side::Buy).map(|t| t.qty).sum();
        let sold: Decimal = p.trades.iter().filter(|t| t.side == Side::Sell).map(|t| t.qty).sum();
        assert_eq!(shares, bought - sold, "seed {seed} lots {:?}", l.lots.iter().map(|x| (x.id.clone(), x.qty)).collect::<Vec<_>>());
    }
}

/// With an IRA in the mix, disallowed = temporary (into taxable basis) + permanent, and a loss
/// never disallows more than itself.
#[test]
fn disallowed_never_exceeds_loss() {
    for seed in 0..200 {
        let p = portfolio(seed, true);
        let l = replay(&p).unwrap();
        for r in &l.realizations {
            assert!(r.disallowed >= Decimal::ZERO);
            assert!(r.disallowed_permanent <= r.disallowed);
            if r.realized >= Decimal::ZERO || r.tax_exempt {
                assert!(r.disallowed.is_zero(), "seed {seed}: {r:?}");
            } else {
                assert!(cents(r.disallowed) <= cents(-r.realized), "seed {seed}");
            }
        }
        for lot in &l.lots {
            if p.account(&lot.account).unwrap().kind.tax_advantaged() {
                assert!(lot.wash_adjustment.is_zero());
            }
            assert!(lot.holding_start <= lot.acquired);
        }
    }
}

#[test]
fn accepts_json_numbers_and_rejects_unknown_accounts() {
    let ok = r#"{"portfolio":{"accounts":[{"id":"a"}],"trades":[{"id":"1","account":"a","date":"2026-01-02","side":"buy","symbol":"x","qty":10,"price":148.2}]}}"#;
    let out = lotwise_engine::api::replay(ok).unwrap();
    assert!(out.contains(r#""basis":"1482.00""#), "{out}");
    assert!(out.contains(r#""symbol":"X""#));
    let bad = ok.replace(r#""account":"a""#, r#""account":"zz""#);
    assert!(lotwise_engine::api::replay(&bad).unwrap_err().contains("unknown account"));
    assert!(lotwise_engine::api::replay("{").unwrap_err().starts_with("invalid input"));
}

#[test]
fn mixed_term_when_lots_differ() {
    let json = r#"{"portfolio":{"accounts":[{"id":"a"}],"trades":[
        {"id":"old","account":"a","date":"2024-01-02","side":"buy","symbol":"X","qty":"1","price":"10"},
        {"id":"new","account":"a","date":"2026-01-02","side":"buy","symbol":"X","qty":"1","price":"10"}]},
        "proposal":{"account":"a","symbol":"X","qty":"2","price":"20","date":"2026-03-01"}}"#;
    let out: serde_json::Value = serde_json::from_str(&lotwise_engine::api::simulate(json).unwrap()).unwrap();
    assert_eq!(out["term"], "mixed");
    assert_eq!(out["shortTerm"], "10.00");
    assert_eq!(out["longTerm"], "10.00");
    assert_eq!(out["estTax"], "3.90");
}
