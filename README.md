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

Single static `index.html`, no build step. Deployed on Vercel.
