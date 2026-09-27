# Evidence Record: Implemented Shape

This document describes only the evidence structure represented by the current Pydantic API models and service. It is a repository-local description, not an external pod contract.

## Record Fields

| Field | Current representation | Notes |
|---|---|---|
| `evidence_id` | Generated string ID | Generated when an evidence object is created. |
| `capture_id` | String | Associates the evidence with a capture. |
| `check_id` | `CheckKey` enum value | Identifies the prep check, such as `fnsku_placement`. |
| `source_type` | `mock_observation`, `provider_observation`, or `image` in the Pydantic model | The current service emits `mock_observation` for the default provider and `provider_observation` for other providers. |
| `observation` | String | The provider/mock observation value for the check. |
| `source_ref` | Nullable string | Current service uses the first photo ID only when the observation includes a location and a photo is present; otherwise null. |
| `reference_location` | Nullable string | Current mock path stores `mock_profile:<profile>` here; this is provenance of the fixture, not an image coordinate. |
| `bounding_box` | Nullable normalized box (`x`, `y`, `width`, `height`) | Mock path leaves this null. Provider location is attached only when an observation includes one. It must never be fabricated. |
| `explanation` | String | For mock records, explicitly states that no image was analyzed and no bounding box is claimed. |

The service appends each created evidence ID to the associated observation, and the deterministic rule result carries those IDs in `evidence_refs`. The UI uses these links to display evidence alongside each check. Provider failure currently returns no evidence objects and marks the capture pending for human review.

## Provenance and Limitations

- The current default is deterministic mock output selected by `mock_profile`; it is not derived from uploaded image pixels.
- Evidence objects are returned by the API and held in process memory. They are not immutable, tamper-evident, or externally anchored.
- The current mock `reference_location` identifies the selected mock profile, not a point or region in a photo.
- The SQL draft has an `evidence.source_type` check constraint permitting `mock_observation` and `image`, while the Pydantic model/service also use `provider_observation`. Reconcile this mismatch before integrating persistence.
- The database draft associates evidence with `org_id`; runtime service persistence and tenant authorization are not implemented.

## No External Contract Claim

No cross-pod contract, external schema agreement, or third-party integration is asserted here. Any such contract must be agreed and versioned separately before use.
