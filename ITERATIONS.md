# Bank transfer: account number first

The question: can the app work out the bank from the account number alone, so the customer never picks a bank?

## What's actually possible in Kenya

- **There is no IBAN and no shared check digit.** A Kenyan account number doesn't name its bank, so there's no lookup that always gives the right answer.
- **But each bank issues a fixed length, usually with a branch code up front.** Published account numbers show it clearly. KRA's list of collection accounts has Co-op at 14 digits starting `011`, Equity at 13 starting `0` + branch, KCB at 10 starting `11`, Stanbic at 13 starting `01000`, NBK at 14 starting `010` or `020`, and so on. Banks confirm the lengths themselves: Co-op says 14 digits and Equity says 13.
- **Pesalink can confirm the account holder's name before money moves.** IPSL describes this as "account validation". That turns a guess into a certainty.
- **Pesalink can also send to a phone number linked to a bank account.** The sender sees which banks the recipient has linked.

So the design is: **guess the bank from the shape of the number, then let the bank confirm it.** The customer only sees a bank list when both fail.

## How a number gets resolved

1. **Saved payees.** These resolve instantly, on the device.
2. **Co-op's own customers.** Co-op can look up its own accounts directly. That makes them free, instant, and independent of format rules.
3. **Shape of the number.** `bankid.js` ranks every bank by prior × length fit × leading-digit likelihood and explains its reasoning.
4. **Pesalink name check.** It asks the likeliest banks at once and accepts the first one that confirms.
5. **Phone number.** If the number is a Kenyan mobile number, the app offers the recipient's Pesalink-linked banks or M-Pesa.
6. **Fallback.** A short list of likely banks comes first, then every bank.

## Round 1: work out the bank

**Changed**
- The engine ranks banks with a probability and reasons.
- The screen shows the leading guess from the third digit.
- A length meter shows how many digits are left.
- The name check runs on its own when you pause. If the first bank says no, it moves to the next likely bank.
- Typos are caught against saved payees.
- Phone numbers are routed to Pesalink or M-Pesa.
- A "Why?" panel shows the reasoning.

**Why**
- Your Figma flow asks for the account number, then makes the customer type and pick a bank. That's the slowest step, and picking the wrong bank is a common way transfers fail.
- Taking the account number first used to be a weak order. Now it's the right one, because the number answers the bank question.

**Improvement**

| Flow | Taps | Screens before amount |
|---|---|---|
| Figma flow (13-digit number) | about 18 (13 digits, Continue, 3 to 4 letters of the bank, pick, Continue) | 3 |
| Now, typed | 14 | 1 |
| Now, pasted | 2 | 1 |
| Now, saved payee | 1 (or 3 digits and a tap) | 1 |

## Round 2: faster, learns, safer

**Changed**
- **Every likely bank is checked at once**, with results shown in order. Waiting takes as long as the slowest check, not all of them added up. When no longer format is still possible, the check starts after 150 ms instead of 650 ms.
- **When the first guess is wrong, the app remembers.** It stores the first 4 digits for that bank, so the next number like it is guessed right.
- **A near-miss of a saved payee blocks Continue.** Examples are swapped digits or one wrong digit. The customer must confirm or switch to the payee they meant.
- **Polish:**
  - Phone numbers read `0723 542 388`.
  - Wording says "an Equity account".
  - The review sheet says "Bank transfer" instead of "Lined up by Co-op AI".
  - One shared formatter is used across the app.

**Why**
- Speed decides whether automatic detection feels magical or slow.
- Pesalink transfers are instant and hard to reverse, so a one-digit slip toward a stranger is the costliest error in the flow. A warning someone can scroll past isn't enough; it has to block.

**Improvement**
- A number at the second most likely bank resolves in about 0.6 s instead of about 1.2 s.
- After one correction, that bank becomes the first guess (76% in the GTBank example).

**At scale:** every confirmed Pesalink transfer is a labelled example of an account number and its bank. Across Co-op's customers, the format table could maintain itself without anyone writing rules.

## Round 3: one brain for tapping and talking

**Changed**
- **Co-op AI no longer asks "Which bank?"** for an account number. It works out the bank, confirms the name, or spots a typo and offers the right payee.
- **Pasting a WhatsApp message pulls out the bank, name and amount.**
  - The confirmed account name is compared with the name in the message.
  - A mismatch blocks Continue. This is the classic "our account has changed" scam.
  - The amount screen fills in the amount from the message and says where it came from.

**Why**
- Account numbers usually arrive inside a message.
- The name in that message is a free second check that costs the customer nothing.
- The chat and the native screens should never disagree about who an account belongs to.

## Round 4: feels native, works for everyone

**Changed**
- **Screen readers announce** the bank guess once per change, plus the confirmed name.
- **Phones vibrate lightly** on success and with a distinct pattern on warnings.
- **Swiping from the left edge goes back**, as in iOS. Taps on keys near the edge still register.
- **Toasts sit clear** of the transfer header.

**Why**
- Detection only helps if everyone can perceive it.
- Back gestures are muscle memory, so breaking them makes the prototype feel fake.

## Round 5: tested on small phones

**Found**
- On an iPhone SE (375×667) and in the desktop phone frame, the keypad pushed the scam warning's "I've checked" button below the fold.
- The main button meanwhile read "Confirm the account first", pointing to a control the customer couldn't see.

**Changed**
- **Once the account is resolved, the keypad slides away**, since it has done its job.
- **Tapping the number brings it back** ("Tap the number to edit"), and the cursor hides while the number is settled.
- **Paste confirmations moved** above the main button instead of over the content.

**Why**
- A block the customer can't act on is worse than no block.
- After resolution, the recipient is the only thing that matters on screen.

**Improvement**
- The resolved state now fits without scrolling on an iPhone SE: content height 469 px equals the visible height. Before, 411 px of content sat in 261 px of space.

## Round 6: range, not just depth

Rounds 1 to 5 went deep on one idea: type the number and we work out the bank. Before going deeper, I stepped back and asked the question from Interface Craft's *Conceptual Range*: **why does the customer need to type an account number at all?**

### Seven structurally different directions

| # | Direction | What it answers | Strength | Weakness |
|---|---|---|---|---|
| 1 | Type the number (rounds 1–5) | "I have their number" | Works for anyone at any bank | Still 10 to 16 digits, typo risk |
| 2 | Paste it (round 3) | "It's in a message" | 2 taps, carries name and amount | Only when there's a message |
| 3 | Pick a person: phone or @tag | "I know them, not their number" | Free and instant inside Co-op | Tags only cover Co-op customers |
| 4 | Search by name | "I've paid them before" | Zero digits | Can't search other banks by name (privacy) |
| 5 | Scan it | "It's on paper or a screen" | Zero typing | Camera and OCR, lighting, trust |
| 6 | Ask them for their details | "I don't have their details" | **They** type their own number: no typo, no forwarded scam | Needs them to respond |
| 7 | Never ask | "I pay the same people" | Zero input | Only repeat payees |

**Chosen:** a mix where **typing is the fallback, not the front door.**
- One field accepts an account number, phone number, name or @tag. Repeat payees and recents appear before you type.
- "Ask for their details" handles the rest by inverting the problem: the recipient types their own number.
- Scanning is the next round's candidate.

**Changed**
- **The field takes anything.**
  - **ABC** on the keypad (or just typing a letter on a computer) searches payees, contacts and Co-op @tags.
  - Typing digits switches back to the number pad.
  - Picking an @tag goes straight to a free Within Co-op transfer.
- **Name search is deliberately limited** to your own payees, contacts and public @tags. It says why: other banks' customers can't be looked up by name, which keeps them private.
- **Paste and "Ask for their details" sit above the keypad.** The ask sheet writes the message for you, then lets you share it (the phone's share sheet) or copy the link. When they reply, the account shows up with the name already confirmed ("Added by Grace through your link"). The demo has a "simulate" button.
- **No-result searches lead somewhere:** "No one called… Ask for their details."

**Why:** the safest account number is one the customer never typed. In direction 6, the person who owns the account enters it, which removes both typos and the scam where a forwarded message carries someone else's number.

## Honest limits

- **The format table is a starting point** built from published numbers. Production needs a table maintained with IPSL and each bank, and must confirm every guess through Pesalink validation, as this flow does.
- **The directory, names and phone links are sample data.** Any plausible number "exists" in the demo so it can be tried freely.
- **What the app learns stays on this device** (`localStorage`). The bank-wide version would learn on the server from confirmed transfers.

## Next

- Scan an account number from a cheque, invoice or screenshot with the camera.
- Have the server learn formats from confirmed transfers across all customers.
- Hand off to RTGS above Pesalink's Ksh 999,999 limit.

Sources:
- [KRA agent bank account details (published account numbers by bank)](https://eprocedures.investkenya.go.ke/media/KRA-Bank-Accounts-20052015.pdf)
- [Co-op Bank: account numbers are 14 digits](https://x.com/Coopbankenya/status/1529915525681270789)
- [Equity Bank: 13-digit account numbers](https://x.com/KeEquityBank/status/928856238867320832)
- [Absa Kenya: 10 digits, older accounts carry a 3-digit branch code](https://x.com/AbsaKenya/status/1226947312309719041)
- [IPSL: Pesalink account validation and limits](https://mail.ipsl.co.ke/pesalink/pesalink-integration)
- [KCB: Pesalink send-to-phone and linked banks](https://ke.kcbgroup.com/faqs/faqscategory/pesa-link)
- [Bank and branch code structure in Kenya](https://www.slash.com/routing-numbers/country/kenya)
- [Bank paybill guide (DTB 10 digits, Family Bank 12 digits)](https://businessradar.co.ke/?p=9850)
