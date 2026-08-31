# Phase 1 Architecture

## Separation of concerns

1. **Source adapters** retrieve authoritative climate data.
2. **Normalization layer** converts each source into stable internal JSON contracts.
3. **Validation layer** rejects malformed/stale data before publication.
4. **Dashboard layer** reads only normalized web-ready files.
5. **Prediction engines** remain separate and disabled until historical skill is demonstrated.

## Planned modules

- `climate_ingest`: RONI/ENSO, MJO/RMM, PNA, NAO
- `climate_history`: append-only normalized history
- `analog_engine`: future multivariate analog ranking
- `precip_engine`: future validated precipitation outlook generation
- `flash_flood_engine`: future MPD/FFW/FFE-conditioned outlook generation
- `ufvs_engine`: future regional interpretation of national/regional signals

## Scientific guardrail

The frontend must never infer a precipitation or flash-flood prediction solely from an indicator state. Prediction JSON products must carry an explicit `active=true` flag before rendering operational-looking output.
