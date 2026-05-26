# How Prompt Chains Work

Prompt chains link related prompts so a build issue can move through a structured workflow:

`Fix -> Validation -> Regression`

## Chain Fields

Each generated prompt can include:

- `chainId`
- `chainType`
- `promptType`
- `issueType`
- `contextKey`
- `projectId`
- status timestamps

The current implementation uses the build log record id as the chain id.

## Prompt Types

### Fix

The first prompt generated from a detected issue. It includes the original build log, detected files/symbols, suggested fix, and project memory safety rules.

### Validation

A focused checklist to verify the fix worked.

### Regression

A follow-up check to make sure nearby systems were not broken.

## Duplicate Prevention

The app prevents duplicate pending prompts when these fields match:

- project
- chain id
- prompt type
- issue type
- context key

Completed, sent, failed, approved, and rejected prompts do not block future prompts the same way pending prompts do.

## Statuses

- `pending`
- `approved`
- `sent`
- `completed`
- `failed`
- `rejected`

## Timeline

Prompt generation and duplicate-prevention events appear in **SESSION TIMELINE**.

## Beta Limitations

- There is no separate chain database yet; chains are inferred from approval records.
- There is no archive flow yet.
- Old-chain reopening is allowed by status behavior but not presented as a named UI workflow.

