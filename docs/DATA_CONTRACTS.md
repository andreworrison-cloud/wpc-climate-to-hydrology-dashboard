# Data Contracts

Every real-time indicator record should eventually contain:

- `id`
- `display_name`
- `value`
- `units`
- `state`
- `valid_time`
- `source_name`
- `source_url`
- `retrieved_at`
- `freshness_hours`

Forecast/prediction products should additionally carry:

- `issued_at`
- `valid_start`
- `valid_end`
- `method_version`
- `training_period`
- `skill_metadata`
- `confidence`
- `active`

Prediction products must default to `active=false` until validated.
