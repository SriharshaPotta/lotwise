export type AccountId = "brokerage-one" | "brokerage-two" | "roth-ira";

export interface Account {
  id: AccountId;
  name: string;
  isIra: boolean;
}

export const ACCOUNTS: readonly Account[] = [
  { id: "brokerage-one", name: "Brokerage One", isIra: false },
  { id: "brokerage-two", name: "Brokerage Two", isIra: false },
  { id: "roth-ira", name: "Roth IRA", isIra: true },
];

export function account(id: AccountId): Account {
  const a = ACCOUNTS.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown account ${id}`);
  return a;
}
