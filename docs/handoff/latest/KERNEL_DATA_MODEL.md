# MŪV Kernel Data Model

## Tables

### learners
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID, PK) | Learner identifier |
| display_name | text | Display name |
| created_at | timestamp | Creation time |
| preferences | jsonb | User preferences |

### concepts
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID, PK) | Concept identifier |
| label | text | Concept name |
| domain | text | Knowledge domain |
| description | text | Optional description |
| created_at | timestamp | Creation time |

### learning_graph_edges
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID, PK) | Edge identifier |
| from_concept_id | varchar | Source concept |
| to_concept_id | varchar | Target concept |
| edge_type | text | Relationship type (default: "prerequisite") |

### course_blueprints
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID, PK) | Blueprint identifier |
| title | text | Course title |
| description | text | Course description |
| concept_ids | jsonb (string[]) | Associated concept IDs |
| learner_id | varchar | Owner learner |
| created_at | timestamp | Creation time |

### course_runs
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID, PK) | Run identifier |
| blueprint_id | varchar | Parent blueprint |
| learner_id | varchar | Learner |
| status | text | "active", "completed", "paused" |
| progress | real | 0.0 - 1.0 |
| started_at | timestamp | Start time |
| completed_at | timestamp | Completion time |

### mastery_states
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID, PK) | State identifier |
| learner_id | varchar | Learner |
| concept_id | varchar | Concept |
| score | real | 0.0 - 1.0 mastery score |
| stability | real | 0.0 - 1.0 stability score |
| last_demonstrated_at | timestamp | Last demonstration |

### weak_points
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID, PK) | Weak point identifier |
| learner_id | varchar | Learner |
| concept_id | varchar | Related concept |
| wp_type | text | misconception, fragile_understanding, transfer_failure, signal_prioritization, attention_drift |
| severity | real | 0.0 - 1.0 |
| signals | jsonb (object[]) | Detection signals |
| evidence_refs | jsonb (string[]) | Referenced evidence IDs |
| resolved_at | timestamp | Resolution time (null = active) |
| created_at | timestamp | Detection time |

### evidence_artifacts
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID, PK) | Artifact identifier |
| learner_id | varchar | Learner |
| session_id | varchar | Session identifier |
| artifact_type | text | quiz_attempt, game_run, evidence_pack, checkpoint, portfolio_entry, etc. |
| hash | text | SHA-256 content hash (16 chars) |
| integrity | text | "prototype" or "verified" |
| tags | jsonb (string[]) | Searchable tags |
| metrics | jsonb (object) | Quantitative metrics |
| payload | jsonb (object) | Full replayable data |
| created_at | timestamp | Creation time |

### portfolio_items
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID, PK) | Item identifier |
| learner_id | varchar | Learner |
| title | text | Portfolio entry title |
| description | text | Description |
| artifact_ids | jsonb (string[]) | Referenced artifact IDs |
| created_at | timestamp | Creation time |

### pins
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID, PK) | Pin identifier |
| learner_id | varchar | Learner |
| content | text | Pinned content |
| source | text | "voice", "manual", "speak_history" |
| resolved | boolean | Whether pin has been addressed |
| created_at | timestamp | Creation time |

### event_log
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID, PK) | Event identifier |
| learner_id | varchar | Associated learner |
| event_type | text | Event type string |
| payload | jsonb (object) | Event data |
| timestamp | timestamp | Event time |

## Kernel Rules

### Mastery Acceptance
- **Confidence Gate**: Delta rejected if confidence < 0.3
- **Delta Cap**: Maximum ±0.25 per update
- **Stability Requirement**: Negative deltas rejected if stability < 0.5 (prevents misconception false positives)
- Only plugins PROPOSE deltas; kernel ACCEPTS or REJECTS

### Weak Point Detection
Signal-based detection:
- `repeated_errors` (≥2) → misconception
- `slow_correct` (≥1) → fragile_understanding
- `transfer_fail` (≥1) → transfer_failure
- `signal_sort_error` (≥2) → signal_prioritization
- `pin/interruption` (≥3) → attention_drift
