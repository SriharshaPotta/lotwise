// Agents transcript (§4.7). The tool-call receipt and the reply are written from the engine result.
import { longDate, money, shortDate } from "@/lib/format";
import { agentXyz } from "./scenarios";
import { LOTS } from "./trades";

export const AGENT_TOOL = "check_trade_tax_impact";

export function agentTranscript() {
  const { result, safeFrom } = agentXyz();
  const lot = LOTS.xyz;
  const loss = money(result.realized, { whole: true });
  const lossAbs = money(Math.abs(result.realized), { whole: true });
  return {
    user: `Sell my ${lot.symbol} to lock in the loss, then buy it back next week.`,
    receipt: {
      sale: `SELL ${lot.qty} ${lot.symbol}`,
      realized: loss,
      risk: result.wash ? "HIGH" : "LOW",
      safeFrom: shortDate(safeFrom).toUpperCase(),
    },
    reply:
      `Selling now locks in a ${lossAbs} loss, but buying back next week would disallow it. ` +
      `I’ll sell today and set a reminder to rebuy on ${longDate(safeFrom)}, or I can buy a ` +
      `similar-but-not-identical ETF now. Which do you prefer?`,
  };
}
