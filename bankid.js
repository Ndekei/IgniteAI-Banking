/*
 * BankID — work out which Kenyan bank an account number belongs to.
 *
 * Kenyan account numbers are not self-describing (no IBAN, no shared check digit),
 * but each bank issues numbers of a fixed length with recognisable leading digits
 * (often a branch code). This engine ranks banks by:
 *   prior (how common the bank is)  ×  length fit  ×  prefix likelihood
 * and returns a probability for each, with the reasons behind it.
 *
 * Formats come from published account numbers (KRA collection accounts, bank
 * support answers). They are a starting point: production should load a format
 * table maintained with IPSL and each bank, and confirm every guess with a
 * Pesalink account-validation (name enquiry) call before money moves.
 *
 * Works in the browser (window.BankID) and in Node (module.exports) for tests.
 */
(function (root) {
  "use strict";

  // L = likelihood ratio when the number starts with this pattern.
  // Pattern syntax: digits, x = any digit, [a-b] = digit class.
  const BANKS = [
    { id: "equity", name: "Equity Bank", short: "Equity", code: "68", color: "#A32A29", init: "EQ", prior: 1.0, len: [13],
      pats: [{ p: "0[1-2]x0", L: 6, why: "starts 0 + a branch code" }], src: "13 digits (Equity support)" },
    { id: "kcb", name: "KCB Bank", short: "KCB", code: "01", color: "#2D8A3E", init: "KCB", prior: 1.0, len: [10],
      pats: [{ p: "11", L: 12, why: "KCB numbers start 11" }, { p: "12", L: 8, why: "KCB numbers start 12" }], src: "10 digits" },
    { id: "coop", name: "Co-operative Bank", short: "Co-op", code: "11", color: "#1F7A2E", init: "CO", prior: 0.9, len: [14], strict: "01",
      pats: [{ p: "011", L: 30, why: "Co-op numbers start 011" }], src: "14 digits (Co-op support)", internal: true },
    { id: "ncba", name: "NCBA Bank", short: "NCBA", code: "07", color: "#2B3990", init: "NC", prior: 0.6, len: [10],
      pats: [{ p: "7", L: 5, why: "former CBA numbers start 7" }, { p: "100", L: 4, why: "former NIC numbers start 100" }], src: "10 digits" },
    { id: "absa", name: "Absa Bank Kenya", short: "Absa", code: "03", color: "#AF144B", init: "AB", prior: 0.6, len: [10],
      pats: [{ p: "20", L: 6, why: "branch-prefixed Absa numbers" }], src: "10 digits (Absa support)" },
    { id: "stanchart", name: "Standard Chartered", short: "StanChart", code: "02", color: "#0473EA", init: "SC", prior: 0.45, len: [13],
      pats: [{ p: "010[1-9]", L: 10, why: "starts 010 then a branch digit" }], src: "13 digits" },
    { id: "stanbic", name: "Stanbic Bank", short: "Stanbic", code: "31", color: "#0033A1", init: "SB", prior: 0.45, len: [13],
      pats: [{ p: "01000", L: 25, why: "Stanbic numbers start 01000" }], src: "13 digits" },
    { id: "im", name: "I&M Bank", short: "I&M", code: "57", color: "#C8102E", init: "IM", prior: 0.45, len: [14],
      pats: [{ p: "001", L: 8, why: "I&M numbers start 001" }], src: "14 digits" },
    { id: "dtb", name: "Diamond Trust Bank", short: "DTB", code: "63", color: "#E4A11B", init: "DT", prior: 0.45, len: [10],
      pats: [{ p: "000", L: 8, why: "DTB numbers start 000" }, { p: "00", L: 3, why: "DTB numbers start 00" }], src: "10 digits (DTB paybill guide)" },
    { id: "family", name: "Family Bank", short: "Family", code: "70", color: "#5C2D91", init: "FB", prior: 0.4, len: [12],
      pats: [{ p: "06", L: 4, why: "Family Bank numbers start 06" }], src: "12 digits (Family Bank paybill guide)" },
    { id: "nbk", name: "National Bank", short: "NBK", code: "12", color: "#00703C", init: "NB", prior: 0.35, len: [14],
      pats: [{ p: "010", L: 12, why: "NBK numbers start 010" }, { p: "020", L: 12, why: "NBK numbers start 020" }], src: "14 digits" },
    { id: "cib", name: "CIB Kenya", short: "CIB", code: "", color: "#1B3C73", init: "CIB", prior: 0.25, len: [13],
      pats: [{ p: "003", L: 8, why: "CIB numbers start 003 (sample format)" }], src: "sample format" },
    { id: "postbank", name: "Kenya Post Office Savings Bank", short: "Postbank", code: "", color: "#E30613", init: "PB", prior: 0.2, len: [13],
      pats: [{ p: "07", L: 6, why: "Postbank numbers start 07" }], src: "13 digits" },
    { id: "prime", name: "Prime Bank", short: "Prime", code: "10", color: "#7A1F2B", init: "PR", prior: 0.2, len: [10],
      pats: [{ p: "300", L: 8, why: "Prime numbers start 300" }], src: "10 digits" },
    { id: "citi", name: "Citibank", short: "Citi", code: "16", color: "#056DAE", init: "CT", prior: 0.15, len: [10],
      pats: [{ p: "030", L: 8, why: "Citi numbers start 030" }], src: "10 digits" },
    { id: "gtb", name: "Guaranty Trust Bank", short: "GTBank", code: "", color: "#E05206", init: "GT", prior: 0.15, len: [10],
      pats: [{ p: "114", L: 3, why: "GTBank numbers start 114" }], src: "10 digits" },
    { id: "gulf", name: "Gulf African Bank", short: "Gulf African", code: "", color: "#00843D", init: "GA", prior: 0.15, len: [10],
      pats: [{ p: "052", L: 8, why: "Gulf African numbers start 052" }], src: "10 digits" },
    { id: "hf", name: "HFC (Housing Finance)", short: "HFC", code: "", color: "#E87722", init: "HF", prior: 0.15, len: [10],
      pats: [{ p: "704", L: 8, why: "HFC numbers start 704" }], src: "10 digits" },
    { id: "guardian", name: "Guardian Bank", short: "Guardian", code: "", color: "#004B87", init: "GB", prior: 0.1, len: [10],
      pats: [{ p: "550", L: 6, why: "Guardian numbers start 550" }], src: "10 digits" },
    { id: "uba", name: "UBA Kenya", short: "UBA", code: "", color: "#D52B1E", init: "UB", prior: 0.1, len: [14],
      pats: [{ p: "550", L: 6, why: "UBA numbers start 550" }], src: "14 digits" },
    { id: "consolidated", name: "Consolidated Bank", short: "Consolidated", code: "", color: "#6B8E23", init: "CB", prior: 0.1, len: [14],
      pats: [{ p: "100", L: 5, why: "Consolidated numbers start 100" }], src: "14 digits" },
    { id: "credit", name: "Credit Bank", short: "Credit Bank", code: "", color: "#8B0000", init: "CR", prior: 0.1, len: [13],
      pats: [{ p: "002", L: 5, why: "Credit Bank numbers start 002" }], src: "13 digits" },
    { id: "access", name: "Access Bank Kenya", short: "Access", code: "", color: "#F37021", init: "AC", prior: 0.15, len: [13], pats: [], src: "13 digits (Access paybill guide)" },
    { id: "paramount", name: "Paramount Bank", short: "Paramount", code: "", color: "#4B0082", init: "PM", prior: 0.1, len: [12],
      pats: [{ p: "010", L: 4, why: "Paramount numbers start 010" }], src: "12 digits" },
    { id: "victoria", name: "Victoria Commercial Bank", short: "Victoria", code: "", color: "#003366", init: "VC", prior: 0.1, len: [12],
      pats: [{ p: "001", L: 4, why: "Victoria numbers start 001" }], src: "12 digits" },
    { id: "ecobank", name: "Ecobank Kenya", short: "Ecobank", code: "", color: "#005D8C", init: "EC", prior: 0.15, len: [16],
      pats: [{ p: "001", L: 4, why: "Ecobank numbers start 001" }], src: "16 digits" },
  ];
  // A Kenyan mobile number typed into the account field (Pesalink "send to phone").
  const PHONE = { id: "phone", name: "Phone number", short: "Phone", color: "#2E8B3A", init: "07", prior: 0.8, len: [10],
    pats: [{ p: "07", L: 40, why: "Kenyan mobile numbers start 07" }, { p: "01[01]", L: 6, why: "newer Safaricom numbers start 010 or 011" }], strict: "0" };

  const byId = Object.fromEntries(BANKS.concat([PHONE]).map(b => [b.id, b]));
  const MAX_LEN = Math.max(...BANKS.map(b => Math.max(...b.len)));

  const clean = (s) => String(s || "").replace(/\D/g, "");

  // Tokenise "0[1-2]x0" → [["0"],["1","2"],null,["0"]] (null = any digit)
  const tokCache = {};
  function tokens(p) {
    if (tokCache[p]) return tokCache[p];
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const c = p[i];
      if (c === "x") out.push(null);
      else if (c === "[") {
        const j = p.indexOf("]", i); const body = p.slice(i + 1, j); const set = [];
        for (let k = 0; k < body.length; k++) {
          if (body[k + 1] === "-") { for (let d = +body[k]; d <= +body[k + 2]; d++) set.push(String(d)); k += 2; }
          else set.push(body[k]);
        }
        out.push(set); i = j;
      } else out.push([c]);
    }
    return (tokCache[p] = out);
  }
  // How much of the pattern the typed digits agree with: -1 = contradicts, else 0..1
  function prefixFit(d, p) {
    const t = tokens(p); const k = Math.min(d.length, t.length);
    for (let i = 0; i < k; i++) if (t[i] && !t[i].includes(d[i])) return -1;
    return k / t.length;
  }

  function scoreBank(b, d) {
    const n = d.length; const max = Math.max(...b.len), min = Math.min(...b.len);
    if (n > max) return null;
    const complete = b.len.includes(n);
    const lenF = complete ? 1 : n < min ? 0.75 : 0.5;
    let L = 1, best = null;
    for (const pt of b.pats) {
      const f = prefixFit(d, pt.p);
      if (f < 0) continue;
      const l = Math.pow(pt.L, f); // partial agreement earns partial credit
      if (l > L) { L = l; best = { ...pt, fit: f }; }
    }
    if (b.strict && prefixFit(d, b.strict) < 0) L *= 0.02;
    else if (!best && b.pats.length && n >= 3) L *= 0.35; // has a known shape and this isn't it
    return { bank: b, raw: b.prior * lenF * L, complete, expected: complete ? n : (b.len.find(x => x > n) || max), match: best };
  }

  function reasonsFor(c, d) {
    const r = [];
    const b = c.bank;
    if (c.complete) r.push(`${d.length} digits, the length ${b.short} uses`);
    else r.push(`${b.short} numbers have ${c.expected} digits, ${c.expected - d.length} to go`);
    if (c.match) r.push(c.match.fit >= 1 ? c.match.why : `${c.match.why} (so far)`);
    if (b.code) r.push(`Bank code ${b.code}`);
    return r;
  }

  // Bank hints in pasted text ("Equity 0180…") strongly boost that bank.
  const HINTS = [
    ["equity", /\bequity\b/i], ["kcb", /\bkcb\b/i], ["coop", /\bco-?op(erative)?\b/i], ["ncba", /\bncba|\bnic\b|\bcba\b/i],
    ["absa", /\babsa|barclays\b/i], ["stanchart", /stan\s?chart|standard chartered|\bscb\b/i], ["stanbic", /\bstanbic\b/i],
    ["im", /\bi\s?&\s?m\b|\bi and m\b/i], ["dtb", /\bdtb\b|diamond trust/i], ["family", /\bfamily\b/i], ["nbk", /\bnational bank\b|\bnbk\b/i],
    ["cib", /\bcib\b|commercial international/i], ["prime", /\bprime\b/i], ["postbank", /\bpost\s?bank\b/i], ["hf", /\bhfc?\b|housing finance/i],
  ];
  function hintFrom(text) { for (const [id, re] of HINTS) if (re.test(text || "")) return id; return null; }

  /**
   * infer(digits, {hint}) → { digits, candidates:[{bank,p,complete,expected,reasons}], top, phone, expected }
   */
  function infer(input, opts = {}) {
    const d = clean(input);
    if (!d.length) return { digits: d, candidates: [], top: null, phone: null, expected: null };
    const rows = [];
    for (const b of BANKS.concat([PHONE])) {
      const s = scoreBank(b, d); if (!s || s.raw <= 0) continue;
      if (opts.hint && b.id === opts.hint) s.raw *= 25;
      rows.push(s);
    }
    const total = rows.reduce((a, r) => a + r.raw, 0) || 1;
    for (const r of rows) { r.p = r.raw / total; r.reasons = reasonsFor(r, d); }
    rows.sort((a, b) => b.p - a.p);
    const phone = rows.find(r => r.bank.id === "phone") || null;
    const banks = rows.filter(r => r.bank.id !== "phone");
    const top = rows[0] || null;
    return { digits: d, candidates: banks, all: rows, top, phone, expected: top ? top.expected : null, tooLong: d.length > MAX_LEN };
  }

  // Group digits for reading: 4s, never leaving a single digit on its own.
  function format(input) {
    const d = clean(input); const g = [];
    for (let i = 0; i < d.length; i += 4) g.push(d.slice(i, i + 4));
    if (g.length > 1 && g[g.length - 1].length === 1) { const last = g.pop(); g[g.length - 1] += last; }
    return g.join(" ");
  }

  // Damerau–Levenshtein distance (optimal string alignment), small inputs only.
  function editDistance(a, b) {
    const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
    }
    return dp[m][n];
  }
  function describeSlip(typed, real) {
    if (typed.length === real.length) {
      const diff = []; for (let i = 0; i < typed.length; i++) if (typed[i] !== real[i]) diff.push(i);
      if (diff.length === 2 && diff[1] === diff[0] + 1 && typed[diff[0]] === real[diff[1]]) return `digits ${diff[0] + 1} and ${diff[1] + 1} are swapped`;
      if (diff.length === 1) return `digit ${diff[0] + 1} is different`;
    }
    return typed.length < real.length ? "a digit is missing" : "there's an extra digit";
  }
  function nearMiss(input, entries, keyFn = (e) => e.acct) {
    const d = clean(input); if (d.length < 8) return null;
    let best = null;
    for (const e of entries) { const k = clean(keyFn(e)); if (!k || k === d) continue; const dist = editDistance(d, k); if (dist === 1 && !best) best = { entry: e, slip: describeSlip(d, k) }; }
    return best;
  }

  const api = { BANKS, PHONE, byId, MAX_LEN, clean, infer, format, editDistance, nearMiss, describeSlip, hintFrom, prefixFit };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BankID = api;
})(typeof window !== "undefined" ? window : globalThis);
