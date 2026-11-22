Integration Testing Policy
Purpose
Integration tests verify:

Controller
Validation
Service
Repository
Database
working together as a complete system.

Unit tests verify isolated logic.

Integration tests verify business behavior and database persistence.

Test Naming
Use:

when*<condition>\_should*<result>
Examples:

when_create_valid_bom_should_create_bom

when_activate_bom_with_cycle_should_return_conflict

when_update_with_stale_version_should_throw_version_conflict
Test Structure
Use AAA structure.

// Arrange

// Act

// Assert
Example:

it("when_create_valid_bom_should_create_bom", async () => {
// Arrange

// Act

// Assert
});
Similar Cases
Use it.each() whenever possible.

Example:

it.each([
["RAW_MATERIAL"],
["FINISHED_GOOD"],
])(
"when*invalid_item_type*%s_should_fail",
async (itemType) => {},
);
Avoid duplicated test code.

Database Verification
Do not verify only the HTTP response.

Always verify database state after mutation.

Example:

const bom = await prisma.bomHeader.findUnique({
where: {
id: createdId,
},
});

expect(bom).toBeDefined();
Rollback Verification
Whenever transactions are involved:

Verify failed operations leave database unchanged.

Example:

expect(activeBom.status).toBe("ACTIVE");

expect(draftBom.status).toBe("DRAFT");
after a failed activation.

Concurrency Testing
Must verify:

Create
duplicate creation prevention
unique constraint enforcement
Update
lost update prevention
optimistic lock conflicts
State Transitions
Verify conflicting transitions.

Examples:

activate vs activate
update vs inactivate
activate vs inactivate
Test Data Policy
Never manually build complex object graphs inside tests.

Use factories and builders.

Examples:

createItemFactory()

createBomFactory()

createActiveBomFactory()

createDraftBomFactory()
Factories belong in:

tests/
└── utils/
└── factories/
Assertion Policy
Required assertions:

HTTP status
response body
database state
Optional assertions:

event publishing
audit logs
notifications
Test Isolation
Every test must:

create its own test data
not depend on execution order
be runnable independently
No shared mutable state.

Minimum Coverage Requirements
Every endpoint should consider:

Success
Happy path.

Validation
DTO validation.

Business Rules
Domain violations.

Not Found
Entity not found.

Concurrency
Lock conflict or version conflict.

Rollback
Partial modifications must not persist.

Utility Functions
Shared helpers belong in:

tests/
└── utils/
├── factories/
├── builders/
├── database/
└── assertions/
Avoid duplicated setup logic.

Database Assertions Requirement
For every successful mutation:

expect(dbRecord).toMatchObject(...);
For every failed mutation:

expect(dbRecord).toEqual(previousState);
Never only assert API response.

Always verify persistence layer state.

Factory Requirements
Factories should produce valid entities by default.

Example:

const item = await createItem();

const activeBom = await createActiveBom();

const draftBom = await createDraftBom();
Tests override only fields relevant to the scenario.

Integration Test Folder Structure
tests/
└── integration/
├── items/
├── boms/
└── utils/
├── factories/
├── builders/
├── assertions/
└── database/
AI Generation Rules
When generating integration tests:

Follow AAA structure
Prefer it.each when applicable
Reuse factories
Verify database state
Verify rollback behavior
Verify optimistic locking behavior
Verify concurrency behavior
Avoid duplicated setup code

Test File Organization
One Endpoint One Test File
Each endpoint should have its own integration test file.

Example:

tests/
└── integration/
└── boms/
├── create-bom.integration.spec.ts
├── update-bom.integration.spec.ts
├── copy-bom.integration.spec.ts
├── activate-bom.integration.spec.ts
├── explode-bom.integration.spec.ts
└── get-bom-revisions.integration.spec.ts
A test file should focus on a single endpoint only.

Avoid mixing multiple endpoints in the same test file.

Required Describe Blocks
Each endpoint test file should follow the same structure.

describe("POST /items/:itemId/boms", () => {
describe("success", () => {});

describe("validation", () => {});

describe("business logic", () => {});

describe("concurrency", () => {});

describe("server error", () => {});
});
Success Block
Contains happy-path scenarios.

Examples:

create successfully
update successfully
activate successfully
Validation Block
Contains DTO and request validation errors.

Examples:

invalid request body
invalid query parameter
invalid path parameter
These failures should occur before business logic execution.

Business Logic Block
Contains domain rule violations.

Examples:

item not found
item inactive
bom not draft
component inactive
cycle detected
These tests verify business requirements.

Concurrency Block
Contains concurrency scenarios involving the same endpoint only.

Examples:

For create endpoint:

create vs create
For update endpoint:

update vs update
For activate endpoint:

activate vs activate
This block should verify:

optimistic locking
unique constraints
endpoint-level concurrent behavior
Cross-endpoint concurrency does not belong here.

Server Error Block
Contains transactional and rollback scenarios.

Examples:

database exception
transaction failure
rollback verification
Requirements:

verify API error response
verify no partial changes persisted
verify database state after rollback
Cross Endpoint Concurrency
Cross-endpoint concurrency must be placed in separate test files.

Do not place them in endpoint test files.

Examples:

tests/
└── integration/
└── concurrency/
├── item-inactivate-vs-bom-activate.integration.spec.ts
├── bom-update-vs-bom-activate.integration.spec.ts
├── item-update-vs-item-inactivate.integration.spec.ts
└── bom-activate-vs-bom-explode.integration.spec.ts
Examples of cross-endpoint concurrency:

item inactivate vs bom activate
bom update vs bom activate
item update vs item inactivate
item inactivate vs bom create
item inactivate vs bom copy
These tests verify interaction between different endpoints and different business processes.

Test Ordering
Within an endpoint file, always follow this order:

describe("POST /items/:itemId/boms", () => {
describe("success", () => {});

describe("validation", () => {});

describe("business logic", () => {});

describe("concurrency", () => {});

describe("server error", () => {});
});
Keeping the same structure across all endpoints improves:

readability
maintainability
onboarding
AI-generated test consistency
