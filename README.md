# IgniteAI Banking

Clickable prototype of a banking app with an AI chat layer. The normal app view and the AI view sit side by side: swipe left on Home (or tap the sparkle button, or press `/`) to talk to the assistant, swipe right to go back.

Type requests such as:

- `Send 10,000 to @victor`
- `Send 5k to Victor's account 011045238903`
- `Save 45,000 to my Money Market Fund`
- `Buy KPLC tokens for 1,000`
- `What did I spend on food this week?`
- `Tuma 2,000 kwa @amara`

Each request becomes a confirmation card. Money only moves after a press-and-hold and a simulated Face ID check, and balances on Home update to match.

All people, balances and fees are sample data. Requests are understood on the device by a rule-based parser; the free-form Claude fallback only runs when the page is opened as a Claude artifact.

## Bank transfer: account number first

Tap **Send** on Home. Type or paste an account number and the app works out the bank from its length and leading digits, confirms the account name, and catches typos and scam-style mismatches. No bank list to scroll. Try:

- `0180 4417 23905` (Equity) · `1123 4578 90` (KCB) · `0110 9876 5432 00` (Co-op, free)
- `1145 6789 02` (first guess is wrong, then it learns)
- `0030 5127 88401` (a typo of a saved payee) · `0723 542 388` (a phone number)
- The "rent message" and "suspicious one" paste samples on the empty screen

How it works and why each change was made: [ITERATIONS.md](ITERATIONS.md). Engine: [`bankid.js`](bankid.js), tests: `node tests/bankid.test.js`.

Static site (`index.html` + `bankid.js`), no build step. Deployed on Vercel.
