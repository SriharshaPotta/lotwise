//! Runs every hand-computed fixture in tests/fixtures/*.json through the JSON API.
//! The same files run against the WASM build from TypeScript (tests/engine-parity.test.ts).
//!
//! Fixture shape: {name, description, call, input, expect | error}. `expect` is a partial match:
//! objects only check the keys they name; arrays must have the same length, unless written as
//! {"$contains": [...]} (each item must match some element).

use lotwise_engine::api;
use serde_json::Value;
use std::fs;

fn call(name: &str, input: &str) -> Result<String, String> {
    match name {
        "replay" => api::replay(input),
        "simulate" => api::simulate(input),
        "simulateLotSale" => api::simulate_lot_sale(input),
        "harvestScan" => api::harvest_scan(input),
        "countdown" => api::countdown(input),
        "yearSummary" => api::year_summary(input),
        other => panic!("unknown call {other}"),
    }
}

fn matches(expect: &Value, actual: &Value, path: &str, errs: &mut Vec<String>) {
    match (expect, actual) {
        (Value::Object(e), _) if e.contains_key("$contains") => {
            let want = e["$contains"].as_array().unwrap();
            let have = actual.as_array().cloned().unwrap_or_default();
            for (i, w) in want.iter().enumerate() {
                if !have.iter().any(|h| {
                    let mut tmp = vec![];
                    matches(w, h, "", &mut tmp);
                    tmp.is_empty()
                }) {
                    errs.push(format!("{path}: no element matches $contains[{i}] = {w}"));
                }
            }
        }
        (Value::Object(e), Value::Object(a)) => {
            for (k, v) in e {
                match a.get(k) {
                    Some(av) => matches(v, av, &format!("{path}.{k}"), errs),
                    None => errs.push(format!("{path}.{k}: missing (expected {v})")),
                }
            }
        }
        (Value::Array(e), Value::Array(a)) => {
            if e.len() != a.len() {
                errs.push(format!("{path}: expected {} items, got {}: {}", e.len(), a.len(), actual));
                return;
            }
            for (i, (ev, av)) in e.iter().zip(a).enumerate() {
                matches(ev, av, &format!("{path}[{i}]"), errs);
            }
        }
        _ if expect == actual => {}
        _ => errs.push(format!("{path}: expected {expect}, got {actual}")),
    }
}

#[test]
fn fixtures() {
    let mut dir: Vec<_> =
        fs::read_dir(concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures")).unwrap().map(|e| e.unwrap().path()).collect();
    dir.sort();
    assert!(dir.len() >= 30, "fixtures missing");
    let mut failures = vec![];
    for path in dir {
        let f: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        let name = f["name"].as_str().unwrap();
        let out = call(f["call"].as_str().unwrap(), &f["input"].to_string());
        match (&f.get("error"), out) {
            (Some(want), Err(e)) => {
                if !e.contains(want.as_str().unwrap()) {
                    failures.push(format!("{name}: error {e:?} doesn't contain {want}"));
                }
            }
            (Some(_), Ok(v)) => failures.push(format!("{name}: expected an error, got {v}")),
            (None, Err(e)) => failures.push(format!("{name}: {e}")),
            (None, Ok(v)) => {
                let actual: Value = serde_json::from_str(&v).unwrap();
                let mut errs = vec![];
                matches(&f["expect"], &actual, "", &mut errs);
                for e in errs {
                    failures.push(format!("{name}{e}"));
                }
            }
        }
    }
    assert!(failures.is_empty(), "{} fixture mismatches:\n{}", failures.len(), failures.join("\n"));
}
