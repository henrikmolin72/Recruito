# 2026-09-06 — Signup tells the user when an email is already registered

**Status:** accepted (pre-launch; revisit when the coming-soon gate comes off)

## Context

Sajid could not create a client account and got a generic Swedish "service unavailable". Reproducing it locally showed the register actions collapsed every failure — existing email, mail-delivery failure, password policy — into that one message, and (worse) deleted an existing account when Supabase returned the same unconfirmed user. See [[2026-36]] and [[signup-gotchas]].

The fix makes `/register/company` and `/register/recruiter` say plainly "This email is already registered. Log in or reset your password instead." That is a **user-enumeration oracle**: anyone can learn whether an address has a Recruito account. Login and password reset stay enumeration-safe.

## Decision

Keep the clear message. Recruito is a B2B recruiting marketplace where a company or recruiter having an account is not sensitive the way a health or dating service would be, and pre-launch the value of a self-explaining signup outweighs the oracle. Bound it instead of hiding it:

- Register actions are throttled at **3 per email+IP and 5 per IP per 15 minutes** (real people register once). The limiter fails open to an in-memory bucket if its RPC is down — accepted.
- `/register` is still behind the coming-soon gate, so the oracle is unreachable by the public today.

## Alternative considered

Answer identically whether or not the email exists and email the address owner instead ("someone tried to register with your address"). Cleaner security posture, worse first-run UX, and it depends on outbound mail that prod does not have yet ([[resend-golive-runbook]]). Switch to this if abuse shows up in the rate-limit logs after launch.
