BOM Domain Testing Policy
BOM Lifecycle
DRAFT
↓
ACTIVE
↓
OBSOLETE
Rules:

At most one DRAFT BOM per item.
At most one ACTIVE BOM per item.
BOM parent cannot be RAW_MATERIAL.
BOM parent cannot be BUY item.
FINISHED_GOOD cannot be a component.
BOM must contain at least one component.
Create BOM
Success
create draft BOM
Validation
invalid payload
Business Rules
parent item not found
parent item inactive
parent item not eligible
component item not found
component item inactive
component item is FINISHED_GOOD
self reference
Concurrency
duplicate draft creation
duplicate revision creation
Database Assertions
Verify:

BOM header created
BOM components created
Update BOM
Success
update draft BOM
Business Rules
BOM not found
BOM not draft
Optimistic Lock
version conflict
Database Assertions
Verify:

header updated
components replaced
version incremented
Copy BOM
Success
copy ACTIVE BOM
copy OBSOLETE BOM
Business Rules
reject DRAFT source
Concurrency
duplicate revision conflict
Database Assertions
Verify:

copied header
copied components
Activate BOM
Success Cases
Single Level:

A
├─ B
└─ C
Multi Level:

A
├─ B
│ └─ D
└─ C
Existing ACTIVE:

OLD ACTIVE
↓
OBSOLETE

NEW DRAFT
↓
ACTIVE
Activation Validation
Root Item
item not found
item inactive
item not eligible
Root BOM
BOM not found
BOM not draft
Structure
empty BOM
Component Validation
component item not found
component item inactive
component item FINISHED_GOOD
Referenced BOM Validation
referenced BOM not found
referenced BOM not active
referenced BOM empty
Data Corruption
multiple active revisions detected
Cycle Detection
Simple Cycle
A
→ B
→ A
Deep Cycle
A
→ B
→ C
→ A
Activation must fail.

Explosion must fail.

Diamond Graph
A
├─ B
│ └─ D
└─ C
└─ D
Verify:

no false cycle detection
quantity aggregation correct
Duplicate Sub-BOM References
A
├─ B
└─ B
Verify:

activation succeeds
duplicate loading causes no issue
Activation Concurrency
Activate vs Activate
Two activation requests simultaneously.

Expected:

only one succeeds
Activate vs Item Inactivate
Activation obtains locks.

Inactivation waits.

Verify final state consistency.

Activate vs BOM Update
Activation obtains locks.

Update waits or fails.

Verify no invalid state.

Activation Rollback
Scenario:

OLD ACTIVE
↓
DEMOTED TO OBSOLETE
↓
FAILURE
Expected:

OLD ACTIVE restored

NEW DRAFT unchanged

No partial state persisted
Explode BOM
Success
single level
multi level
Quantity Accumulation
A × 1

A
└─ B × 2
└─ C × 3
Expected:

B = 2

C = 6
Scrap Rate
Formula:

requiredQty =
quantityPer \* cumulativeQty /
(1 - scrapRate)
Verify calculation precision.

Aggregation
A
├─ B
│ └─ D
└─ C
└─ D
Expected:

D quantity accumulated

Not overwritten
Query Endpoints
Find Revision
found
not found
Find Revisions
pagination
filtering
sorting
Inactive item history remains queryable.

Database Assertion Requirements
Every successful mutation must verify:

BOM header state
component records
status transitions
version values
Every failed mutation must verify:

database unchanged
Recommended Test Utilities
tests/
└── utils/
├── factories/
│ ├── item.factory.ts
│ └── bom.factory.ts
│
├── builders/
│ └── bom-tree.builder.ts
│
├── assertions/
│ └── bom.assertions.ts
│
└── database/
└── database.helper.ts
Recommended BOM Graph Fixtures
Generate reusable builders for:

Items
active item
inactive item
BOMs
active BOM
draft BOM
obsolete BOM
Graph Structures
single level tree
multi level tree
deep tree
simple cycle
deep cycle
diamond graph
shared sub-BOM
large breadth tree
large depth tree
These fixtures should be reused across integration tests.

AI Generation Rules
When generating BOM integration tests:

Use AAA structure
Prefer it.each
Reuse factories and builders
Verify database state
Verify optimistic lock behavior
Verify activation lock behavior
Verify rollback behavior
Verify graph traversal correctness
Verify cycle detection
Verify aggregation correctness
Avoid duplicated setup code
