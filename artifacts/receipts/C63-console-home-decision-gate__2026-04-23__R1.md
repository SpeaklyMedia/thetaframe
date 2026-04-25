# C63 Console Home-Decision Gate

Date: 2026-04-23
Status: Closed

## Summary

C63 closes the current Console observation gate after C61 brand hardening and C62 stretch validation.

Decision:

- keep `/dashboard` as the default signed-in home
- keep `/console` additive
- do not start a home-switch implementation from this gate

## Decision Basis

Inputs reviewed:

- live tokenized Console after C61
- production proof after C62
- authenticated browser matrix result `passes=19`, `skips=0`
- refreshed viewport manifest including the added `6400x1800` stretch surface

What this gate confirms:

- Console is now brand-aligned at the shared-token implementation layer
- Console remains calm and centered-first across the current proof surfaces
- Console is still intentionally read-only for orientation, review pressure, and lane return
- the existing Dashboard home contract remains safer and clearer than forcing a replacement decision now

## Explicit Non-Decisions

This gate does not approve:

- a `/` redirect change away from `/dashboard`
- a Dashboard deprecation plan
- optional Console module expansion by default
- 32:9 orbit-edge secondary layout

## Next Approved Directions

If Console work continues, keep it narrow:

- optional `REACH Capture` or `BizDev Motion` only if hierarchy stays intact
- user preference controls for reduced stimulation, density, and reminder tone
- a separate future plan if anyone wants to trial Console as the default home

## Outcome

The current signed-in home remains:

- `/dashboard`

The current Console role remains:

- premium additive orientation surface across existing lanes
