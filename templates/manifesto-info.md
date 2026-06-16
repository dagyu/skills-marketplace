# How to populate extras/manifesto/MANIFESTO.md

The manifesto is the project's source of truth: its vision and the
non-negotiable guidelines every change must respect. Get it right before any real
work begins.

**Do not write it from assumptions.** Interview the developer first, then write
down what they tell you. Ask:

- **Vision** — What is this project, and why does it exist? Who is it for?
- **Guidelines** — What rules must every change respect? (style, scope,
  testing, performance, security — whatever they care about)
- **Definition of done** — What has to be true before a change counts as finished?

Then write `extras/manifesto/MANIFESTO.md` with these sections:

## Vision

One or two sentences: what the project is and why it exists.

## Guidelines

A numbered list of non-negotiable rules for all work in the repo. Sensible
defaults to **confirm** (not assume) with the developer:

1. **YAGNI.** Build what is needed now, not what might be needed later.
2. **Small, reviewable changes.** One concern per change, one change per commit.
3. **Keep docs honest.** Update `docs/` and `README.md` in the same change that
   alters behaviour.

Add the project-specific rules the developer gives you, and link to deeper
documents as needed.

## Definition of done

A checklist that must hold before a change is done, e.g.:

- [ ] The change is verified to work (however this project verifies).
- [ ] The developer has confirmed the implementation.
- [ ] Documentation and the README reflect the change.
- [ ] The work is committed.

Confirm each item with the developer and adjust it to how they actually work.
