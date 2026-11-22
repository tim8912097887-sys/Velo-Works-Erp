Domain Review Policy (Item & BOM ERP System)
Review Goal

Review the implementation as if you are a Staff Engineer working on a real ERP / MRP manufacturing system.

The review must focus on:

Domain correctness
Business rule correctness
Data integrity
Concurrency safety
Historical traceability
Transaction consistency
ERP manufacturability
Production readiness

Do not focus primarily on code style.

Business correctness is more important than code elegance.

Review Output Format

For every issue found classify it as:

Critical

May cause:

data corruption
duplicate records
lost updates
invalid BOM structures
broken manufacturing process

Must be fixed before merge.

Major

Business rule violation.

Should be fixed before merge.

Minor

Maintainability issue.

Can be fixed later.

General Rules

Reviewer must verify:

No Business Logic in Controller

Controller may only:

validate request
invoke service
return response

Controller must not:

access database
implement domain rules
implement transactions
Service Responsibilities

Service should contain:

business validation
orchestration
domain rules

Service should not:

execute SQL
contain persistence details
Repository Responsibilities

Repository should contain:

database operations
transaction boundaries
locking implementation

Repository should not contain:

business policy decisions
ITEM DOMAIN REVIEW
Item Creation Rules

Reviewer must verify:

itemCode uniqueness

Only one item can exist per itemCode.

Concurrent creation must not create duplicates.

Expected protection:

Plain Text
Database unique constraint
Item Type Rules

FINISHED_GOOD:

Plain Text
MAKE
BOTH

 

Allowed.

Not allowed:

Plain Text
BUY

SUBASSEMBLY:

Plain Text
MAKE
BUY
BOTH

Allowed.

RAW_MATERIAL:

Plain Text
BUY only

Allowed.

Not allowed:

Plain Text
MAKE
BOTH
Immutable Attributes

After creation:

Plain Text
itemType
makeBuy

must never change.

Reason:

Existing BOM structures depend on these values.

Modification may invalidate manufacturing history.

Item Update Rules

Reviewer must verify:

Update can only occur when:

Plain Text
item.active = true

Inactive item must never be modified.

Optimistic Lock

Update must verify:

Plain Text
version

during update.

Expected pattern:

SQL
WHERE id = ?
AND version = ?

Version mismatch must fail.

Item Inactivation Rules

Reviewer must verify:

One-way operation

Inactive item must never become active again.

No reactivation API.

Historical Preservation

Inactivation:

Plain Text
must NOT delete item
must NOT delete BOM
must NOT modify BOM history
Locking

Item inactivation must use pessimistic locking.

Reason:

Other operations depend on item state.

Reviewer must verify:

SQL
UPDLOCK
ROWLOCK

or equivalent mechanism.

Item Concurrency

Reviewer must verify:

Create vs Create

Result:

Plain Text
one item only
Update vs Update

Result:

Plain Text
one success
one version conflict
Inactivate vs Inactivate

Result:

Plain Text
one success
one already inactive
Update vs Inactivate

Valid outcome:

Case A

Plain Text
update commits
inactivate waits
inactivate succeeds

Case B

Plain Text
inactivate commits
update fails

Invalid outcome:

Plain Text
inactive item updated after inactivation
BOM DOMAIN REVIEW
Parent Item Eligibility

Reviewer must verify BOM parent:

Plain Text
exists
active

and is NOT:

Plain Text
RAW_MATERIAL
BUY item
Component Eligibility

Reviewer must verify every component:

Plain Text
exists
active

and is NOT:

Plain Text
FINISHED_GOOD
Self Reference

Must reject:

Plain Text
A -> A
Revision Rules

For each item:

Allowed:

Plain Text
1 ACTIVE
1 DRAFT
N OBSOLETE

Not allowed:

Plain Text
2 ACTIVE
2 DRAFT

Reviewer should verify both:

Plain Text
application checks
database constraints

exist.

BOM Creation Rules

Reviewer must verify:

New revision can be created only when:

Plain Text
parent item active
parent item eligible
components valid
Component Requirement

BOM must contain:

Plain Text
at least one component

Empty BOM is invalid.

BOM Update Rules

Reviewer must verify:

Only:

Plain Text
DRAFT

may be updated.

Must reject:

Plain Text
ACTIVE
OBSOLETE

updates.

Optimistic Lock

Must verify:

Plain Text
version check

exists.

Expected:

SQL
WHERE version = ?
BOM Copy Rules

Allowed source:

Plain Text
ACTIVE
OBSOLETE

Not allowed:

Plain Text
DRAFT

Reason:

System should not create draft from another draft.

BOM Activation Rules

Reviewer must verify activation performs all checks inside transaction.

Root Validation

Root item:

Plain Text
exists
active
eligible
Draft Validation

Target BOM:

Plain Text
exists
DRAFT
contains component
Component Validation

All referenced components:

Plain Text
exist
active

 
Referenced BOM Validation

All referenced BOM revisions:

Plain Text
exist
ACTIVE
contain component
Circular Reference Detection

Must reject:

Plain Text
A -> B
B -> A

and

Plain Text
A -> B
B -> C
C -> A

and any longer cycle.

Tree-wide Validation

Activation validation must traverse the entire BOM tree.

Not just first level.

BOM Explosion Rules

Reviewer must verify:

Explosion may run without lock.

Reason:

Read-only operation.

Explosion must detect:

Plain Text
circular references
missing referenced BOM
empty BOM

 
Requirement Calculation

Shared component quantities must accumulate.

Example:

Plain Text
A
|- B -> D x2
|- C -> D x3

Result:

Plain Text
D = 5
ERP HISTORICAL TRACEABILITY REVIEW

Reviewer must verify:

ACTIVE and OBSOLETE revisions remain immutable.

Historical BOMs must remain reproducible.

Must not:

Plain Text
edit active revision
edit obsolete revision
overwrite historical structure

Historical production records must remain explainable.

TRANSACTION REVIEW

Reviewer must verify:

All state transitions occur inside transaction.

Questions:

Is validation protected from race conditions?
Is lock acquired before protected validation?
Can data change after validation?
Is state transition atomic?
Can partial changes occur?
Could deadlocks appear?
Is lock order deterministic?
LOCKING REVIEW

Reviewer must verify lock ordering consistency.

Expected order:

Plain Text
Root Item

 
↓

 
Current Active BOM

 
↓

 
Target Draft BOM

 
↓

 
Referenced Items

 
↓

 
Referenced BOMs

Reviewer should identify deadlock possibilities.

DATABASE REVIEW

Reviewer must verify existence of:

Item
Plain Text
UNIQUE(itemCode)
BOM Revision
Plain Text
UNIQUE(parentItemId, revision)
Single Draft

Partial unique index:

Plain Text
parentItemId
status = DRAFT
Single Active

Partial unique index:

Plain Text
parentItemId
status = ACTIVE

Business rule must not rely solely on application code.

Database must provide final protection.

PERFORMANCE REVIEW

Reviewer must identify:

N+1 Queries

Bad:

Plain Text
Loop
-> Query

Preferred:

Plain Text
Batch Query
BOM Tree Traversal

Expected:

Plain Text
One query per BFS depth

Not:

Plain Text
One query per component
Large BOM Scalability

Reviewer must evaluate:

Plain Text
100 components
1000 components
10000 components

for query efficiency.

ERROR HANDLING REVIEW

Reviewer must verify:

Errors are domain-specific.

Good:

Plain Text
ItemNotFoundError
ItemNotActiveError
BomRevisionNotDraftError
BomCircularReferenceError
BomActivationConflictError

Bad:

Plain Text
Error
Exception
UnknownError
TEST COVERAGE REVIEW

Reviewer must verify tests cover:

Item

Create

Update

Find

Inactivate

Optimistic lock conflict

Concurrent update

Concurrent inactivation

Update vs inactivate

BOM

Create

Update

Copy

Activate

Find

Revision listing

Activation

Success case

Referenced BOM missing

Referenced BOM inactive

Component inactive

Root inactive

Cycle detected

Multiple levels

Shared component

Missing component

Explosion

Single level

Multi level

Shared component accumulation

Missing revision

Empty revision

Cycle detection

Concurrency

Create vs create

Copy vs copy

Activate vs activate

Activate vs inactivate

Update vs update

Final Review Mindset

Review as if:

thousands of BOMs exist
multiple users operate simultaneously
manufacturing orders depend on the result
historical audit must remain valid forever

Prioritize:

Plain Text
Business correctness

> Data integrity
>
> Concurrency safety
>
> ERP traceability
>
> Performance
>
> Code style
