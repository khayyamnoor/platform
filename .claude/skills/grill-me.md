---
name: grill-me
description: Interview the user relentlessly about every aspect of a plan or idea until shared understanding is reached. Use BEFORE writing a PRD or starting any non-trivial feature. Adapted from Matt Pocock's workshop.
---

# /grill-me

You are interviewing the user about an idea or plan. Your job is to reach a shared design concept through targeted questions, not to produce a plan yet.

## Process

1. **Read the input.** The user passes in a brief, a Slack message, an idea, or a meeting transcript. If they reference files, read them.
2. **Quick recon.** If this is a new feature in an existing repo, do a quick exploration of related code (read 3–5 files) to ground your questions in reality. Use a sub-agent if it would burn >5K tokens.
3. **Walk down the decision tree.** Identify open questions across these dimensions:
   - User experience (who, what, when, edge cases)
   - Data model and invariants
   - Integration points (which existing modules are affected)
   - Failure modes (what breaks, who notices)
   - Out-of-scope (what we are explicitly NOT doing)
   - Cost / budget / timeline constraints
4. **Ask one question at a time.** Each question MUST include:
   - The question itself, plainly stated
   - Your **recommended answer** with one-line rationale
   - The **trade-off** if the user chooses differently
5. **Record as you go.** Each Q+A is appended to `docs/decisions/<NNNN>-<topic>-grill.md`. Number sequentially.
6. **Continue until either**:
   - The user says "stop" / "enough" / "good"
   - You can no longer think of a question whose answer would change the plan
7. **At the end**: summarize the resolved decisions, list any unresolved questions, and update affected reference docs (`architecture.md`, `pricing-model.md`, `tech-stack.md`, etc.).

## Rules

- **Never produce a plan during grilling.** That's `/write-prd`'s job.
- **Don't batch questions.** One at a time. Wait for the answer before the next.
- **Don't be polite.** "What about X?" is fine. Skip preamble.
- **Recommend confidently.** A weak recommendation ("could go either way") is a wasted question.
- **Resolve before you continue.** If the answer reveals a new branch, ask about that branch before returning to your queue.
- **Record verbatim.** Don't paraphrase the user's answers — capture them.

## Failure modes to avoid

- Asking 30 questions in one message — burns the smart zone.
- Asking unanswerable questions (e.g. "what's our north-star metric?" when the user is two devs at a hackathon).
- Recommending what the user already said — listen.
- Continuing past the point of diminishing returns. Quality > quantity.

## Output structure (the on-disk transcript)

```markdown
# Grilling: <topic>
- **Date**: YYYY-MM-DD
- **Input**: <brief or link>
- **Status**: in-progress | complete

## Q&A

### Q1. <question>
**Recommendation**: <your rec> — <one-line rationale>
**Trade-off**: <what changes if user picks differently>
**Answer**: <user's verbatim answer>

### Q2. ...

## Resolved decisions
- ...

## Unresolved
- ...

## Reference docs updated
- `docs/architecture.md` — section X
- ...
```
