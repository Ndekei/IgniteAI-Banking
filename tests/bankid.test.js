// Run: node tests/bankid.test.js
const B = require("../bankid.js");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => { if (cond) pass++; else { fail++; console.log("FAIL", name, extra); } };
const top = (d, o) => { const r = B.infer(d, o); return r.top && r.top.bank.id; };
const pct = (d) => { const r = B.infer(d); return r.top ? `${r.top.bank.short} ${(r.top.p * 100).toFixed(0)}%` : "-"; };

// Shapes taken from published account numbers (invented digits after the prefix)
const cases = [
  ["0180441723905", "equity"], ["0240299611111", "equity"], ["0170291746532", "equity"],
  ["1123457890", "kcb"], ["1187654321", "kcb"], ["1201234567", "kcb"],
  ["01109876543200", "coop"], ["01136001234500", "coop"],
  ["7134567890", "ncba"], ["2045678901", "absa"], ["0102345678901", "stanchart"], ["0100004567891", "stanbic"],
  ["00100234567891", "im"], ["0004567801", "dtb"], ["068000123456", "family"], ["01001234567800", "nbk"],
  ["0030512788410", "cib"], ["3000123456", "prime"], ["0723542388", "phone"],
];
for (const [d, want] of cases) t(`top ${d} → ${want}`, top(d) === want, `got ${pct(d)}`);

// Early typing: 3 digits already points somewhere sensible
t("011 → Co-op early", top("011") === "coop", pct("011"));
t("07 → phone early", top("072") === "phone", pct("072"));
t("11 → KCB early", top("112") === "kcb", pct("112"));
// Probabilities sum to 1
const s = B.infer("0180441723905").all.reduce((a, r) => a + r.p, 0); t("sums to 1", Math.abs(s - 1) < 1e-9);
// Hint from pasted text wins ties
t("hint boosts", top("0180441723905", { hint: B.hintFrom("Pay Equity bank") }) === "equity");
t("hint parse", B.hintFrom("A/C 1123457890 KCB Moi Avenue") === "kcb");
// Too long
t("too long flagged", B.infer("12345678901234567").tooLong === true);
// Format
t("format 13", B.format("0030512788410") === "0030 5127 88410", B.format("0030512788410"));
t("format 10", B.format("1123457890") === "1123 4578 90");
// Typos
t("swap detected", B.editDistance("0030512788401", "0030512788410") === 1);
const nm = B.nearMiss("0030512788401", [{ acct: "0030512788410", name: "Brian" }]);
t("nearMiss swap", nm && /swapped/.test(nm.slip), nm && nm.slip);
t("nearMiss sub", /different/.test(B.nearMiss("0030512788419", [{ acct: "0030512788410" }]).slip));
t("nearMiss none for far", B.nearMiss("1123457890", [{ acct: "0030512788410" }]) === null);

console.log(`\n${pass} passed, ${fail} failed`);
console.log("\nConfidence by digits typed for an Equity number:");
const eq = "0180441723905"; let line = "";
for (let i = 1; i <= eq.length; i++) line += `${i}:${pct(eq.slice(0, i))}  `;
console.log(line);
process.exit(fail ? 1 : 0);
