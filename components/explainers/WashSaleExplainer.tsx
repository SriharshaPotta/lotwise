"use client";

import { WashWindowExplainer } from "./WashWindowExplainer";

/** §5 the-wash-sale: the hero NVDA sale and a buy-back dragged along the calendar. */
export function WashSaleExplainer() {
  return <WashWindowExplainer scenario="washSale" />;
}

/** §5 the-ira-trap: the INTC sale, bought back in a taxable account or the Roth IRA. */
export function IraTrapExplainer() {
  return <WashWindowExplainer scenario="iraTrap" readouts="ira" />;
}
