---
description: On-chain-anchorable risk attestation for a wallet (may include EAS UID + Base mainnet tx)
---

Issue a risk attestation for: **$ARGUMENTS**

Same address-parsing as `/acp-find:risk` — `$ARGUMENTS` must contain a valid EVM address; honour optional `chain:base|ethereum` (default `base`).

Call `acp_risk_attestation` with `{ walletAddress, chain }`.

Render the response:

1. **Headline:** wallet + grade + score (same shape as `/acp-find:risk`).
2. **Attestation envelope** — surface the structured attestation fields (`subject`, `issuer`, `issuedAt`, signed digest, etc.) when present.
3. **On-chain anchor (if published):** when the response includes `attestationUid` + `txHash` + `blockNumber`:
   - Show the EAS UID verbatim — it's a stable on-chain identifier the user can paste into a Solidity contract.
   - Render the tx as a clickable Basescan link: `https://basescan.org/tx/<txHash>`.
   - Note the block number for ordering / reorg-safety reasoning.
4. **No on-chain anchor:** when `attestationUid` is missing, explain that Metabot has not yet published the attestation on-chain — only the top-N attestations land on-chain by policy. Surface the off-chain signed envelope and explain that the user can still verify it client-side.

`acp_risk_attestation` is a free pass-through to the same endpoint that backs TheMetaBot's $1.00 riskAttestation offering on the marketplace. The paid offering adds the on-chain publication step + escrow + audit trail.
