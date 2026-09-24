# Writing Code That Can Be Verified, Not Just Read

**Applies to:** every language you touch — Apex, JavaScript/LWC, Python, Java, C#, TypeScript, SQL, all of it.
**Version:** v2 — supersedes the flat rule list in v1. Same underlying standard; this version explains the reasoning so it generalizes to cases v1 never enumerated.
**Status:** the reasoning below is the actual instruction. The examples are illustrations of it, not a substitute for it.

---

## 0. Read this before anything else

You're an AI. You default toward dense, idiomatic, "clever" code, because that's what
most of your training data rewards — terse solutions read as skilled, verbose ones read
as junior. That instinct is wrong for this use case, and you need to consciously override
it every time, not just when a rule below happens to catch the pattern.

Here's the one sentence to hold onto: **you're not writing code, you're narrating a
sequence of decisions, in order, to someone who has to verify each one is correct.**
If a line can't be predicted before it's parsed, or can't be checked without leaving it
to go read something else first, it's failed its only job — regardless of whether it
also happens to violate one of the named patterns further down.

If you find yourself scanning this document for the specific syntax you're about to
write so you can confirm it isn't explicitly banned, you've already missed the point.
The question is never "is this on the list" — it's "could the person reading this
verify my logic is correct without having to hold more than one unresolved thing in
their head at a time." Apply that question to things this document never anticipated.
That's what it means to actually follow this, instead of pattern-matching against it.

---

## 1. Why this is stricter than normal "clean code" advice

Two things changed, and both push in the same direction.

**First, the economics flipped.** Every argument for terse syntax — `.map()` instead of
a loop, a ternary instead of `if/else`, spread instead of an explicit copy — is really an
argument about *typing cost*: fewer keystrokes, smaller diffs, less to write by hand.
That argument made sense when a human was paying for every character with their own
time. It made zero sense the moment code got cheap to generate. The only cost left is
the *reading* cost, and every one of those "shorter" constructs makes reading slower,
not faster, for a human doing careful verification. So the trade that used to make
sense (spend a little reading-clarity to save a lot of writing-time) no longer has
a second side to the scale. Optimize only for the side that still has a cost: the reader.

**Second, the reader's job changed.** When a competent human colleague writes code,
another human reading it extends some trust — they skim, assume basic competence, and
only slow down where something looks surprising. That's not the situation here. Code
you write is being *audited*, not trusted, because the reader specifically cannot assume
you reasoned correctly — that's the entire reason they're reading it line by line instead
of skimming it. Audit-mode reading is a different, slower, more literal process than
trust-mode reading, and it breaks completely on anything that requires the reader to
resolve an expression in their head before they can tell what happened. Write for the
audit, not the skim.

---

## 2. The reader you're actually writing for

Hold this model in mind, literally, while you write:

- They read **top to bottom, once, in order** — not by jumping around the file first
  to build a map of it.
- They can hold roughly **3–4 unresolved things** in working memory before they start
  losing track of the first one. Every lambda not yet evaluated, every chained call
  not yet resolved, every ternary not yet decided is one of those things — it goes on
  a mental stack, and it has to stay there, correctly, until it resolves.
- They read in a loop of **predict, then confirm**: a name or a comment lets them form
  an expectation of what a line does, and then the line either confirms it (cheap,
  fast, low error rate) or forces them to build understanding from scratch with no
  prior expectation (slow, effortful, and exactly where misreadings happen). Code with
  no naming or commenting in front of a nontrivial line removes the "predict" step
  entirely and forces every single line into the expensive mode.
- They are trying to verify **logic** — decisions, branches, business rules — and
  everything else (copying a field, building a URL string, shaping an object) is just
  **plumbing** that should be boring and instantly recognizable so it can be skipped
  over, freeing their attention for the parts that can actually be wrong. This is the
  real reason an explicit `for` loop beats `.map()` even for something as trivial as
  copying an array: it's not that the loop itself needs scrutiny, it's that keeping
  *all* plumbing in one uniform, unsurprising shape lets the reader's eye learn to
  recognize "this is just plumbing, move on" at a glance. The moment plumbing and logic
  start sharing syntax — a lambda tucked into a `.filter()`, a ternary inside a field
  assignment — the reader has to slow down and read *everything* at logic-speed, because
  they can no longer tell which is which without parsing it first.

---

## 3. The test — use this on anything, including things not listed below

Before you write a nontrivial line, ask:

1. **Could a stranger predict what this line does from its shape alone**, before
   reading its internals — or do they have to parse it first to find out?
2. **Does understanding this line require also understanding another line or function
   that hasn't been read yet?** If yes, that's a context-switch you're forcing on them.
3. **Am I resolving something, or handing the reader something to resolve themselves?**
   Naming a value is resolving it for them. An inline expression is homework.
4. **Is there more than one unresolved thing happening in this line at once?** (a
   condition *and* a transformation, a default *and* a computation, a lookup *and* a
   fallback) — if so, split it; one line should do one thing.
5. **If I stripped out this shorthand, would the code's behavior change, or only its
   character count?** If only the character count, expand it.

If a pattern shows up in your code that isn't in section 4, it's still wrong if it
fails this test, and still fine if it somehow passes it. The list below exists to
calibrate you, not to define the boundary.

---

## 4. What the test looks like in practice

### Compression and chaining
A `return`, getter, or assignment that needs more than one operation collapses several
unresolved steps into a single line the reader has to unpack all at once. Same with
method chaining — each `.filter().map().sort()` link is a fresh unresolved thing stacked
on top of the last one before any of them resolve.

```js
// Fails the test: three unresolved things (length check, .every, the arrow body)
// stacked before you know what's returned.
get allFilesSelected() {
    return this.fileRows.length > 0 && this.fileRows.every(file => file.isSelected);
}

// Passes: each line confirms or extends a prediction you already had.
get allFilesSelected() {
    const hasFileRows = this.fileRows.length > 0;
    if (!hasFileRows) {
        return false;
    }

    let areAllRowsSelected = true;
    for (let i = 0; i < this.fileRows.length; i++) {
        if (!this.fileRows[i].isSelected) {
            areAllRowsSelected = false;
            break;
        }
    }
    return areAllRowsSelected;
}
```

*(LWC/framework exception: if a getter is structurally required for a template binding,
keep the getter — just don't compress what's inside it.)*

### Functional iteration with inline logic — `.map/.filter/.reduce/.forEach/.every/.some/.sort`,
comprehensions, streams, LINQ

An inline lambda is the purest version of "resolve this yourself" — the reader has to
mentally construct a whole sub-function, run it against an element they're imagining,
and hold the result before the surrounding line even makes sense. Use an explicit `for`
loop with a named accumulator instead — it's pure plumbing, so keep it in plumbing shape.

The ban is on *inline logic in the callback*, not on every callback that will ever
exist — `promise.then(handleSuccess)` passes the test fine, because `handleSuccess` is
already named and understanding it doesn't require unpacking anything on the spot.

```apex
// Fails: query text, bind map, and loop body are all built in-place —
// nothing is named before it's used.
for (SObject record : Database.queryWithBinds(
    'SELECT Id, ' + definition.descriptionField + ' FROM ' + definition.objectApiName
        + ' WHERE Id IN :pageIds',
    new Map<String, Object>{ 'pageIds' => pageRecordsById.keySet() }, AccessLevel.USER_MODE
)) { ... }

// Passes: each step is named before it's used in the next one.
String queryText = 'SELECT Id, ' + definition.descriptionField + ' FROM ' + definition.objectApiName;
queryText += ' WHERE Id IN :pageIds';

Map<String, Object> queryBindVariables = new Map<String, Object>();
queryBindVariables.put('pageIds', pageRecordsById.keySet());

List<SObject> descriptionRecords = Database.queryWithBinds(queryText, queryBindVariables, AccessLevel.USER_MODE);

for (SObject record : descriptionRecords) {
    Object description = record.get(definition.descriptionField);
    if (description != null) {
        Id recordId = (Id) record.get('Id');
        RelatedRecord matchingItem = pageRecordsById.get(recordId);
        matchingItem.description = String.valueOf(description);
    }
}
```

### Implicit branching — ternaries and deep `if/else` nesting

A ternary hides a decision inside an expression instead of stating it as one. Deep
nesting does the opposite kind of damage: the decision is stated, but the reader has to
carry every enclosing `if` on their mental stack until the innermost block resolves,
then unwind all of them in reverse. Flatten with guard clauses (early returns) instead
of pyramiding, and always spell out `if/else` rather than compressing it.

```js
// Fails: the condition is buried mid-expression.
const displayName = extension && !title.toLowerCase().endsWith('.' + extension)
    ? title + '.' + extension : title;

// Passes: the decision is stated, not hidden.
let displayName = title;
const titleAlreadyHasExtension = extension && title.toLowerCase().endsWith('.' + extension);
if (extension && !titleAlreadyHasExtension) {
    displayName = title + '.' + extension;
}
```

```js
// Fails: to know what this returns, the reader has to hold three nested
// conditions open at once, then unwind them in reverse.
function getDiscountRate(customer) {
    if (customer != null) {
        if (customer.isActive) {
            if (customer.yearsAsMember > 5) {
                return 0.2;
            }
        }
    }
    return 0;
}

// Passes: each guard clause resolves and discards one condition before the
// reader has to think about the next one. Nothing is ever held open.
function getDiscountRate(customer) {
    if (customer == null) {
        return 0;
    }
    if (!customer.isActive) {
        return 0;
    }
    if (customer.yearsAsMember <= 5) {
        return 0;
    }
    return 0.2;
}
```

### Building things in place — inside a `return`, an object literal, or a call argument

A function call, a string concatenation, or a condition sitting directly inside a
`return {...}` or a call's argument list means the reader has to evaluate it *before*
they can even see what it's being used for. Resolve every piece to a named variable
first, then hand the return statement nothing but plain names.

```js
// Fails: string concatenation happening mid-object-construction.
return {
    ...file,
    downloadUrl: '/sfc/servlet.shepherd/document/download/' + file.contentDocumentId,
    downloadLabel: 'Download ' + displayName
};

// Passes: by the time you reach the return, every value is already resolved and named.
const downloadUrl = '/sfc/servlet.shepherd/document/download/' + file.contentDocumentId;
const downloadLabel = 'Download ' + displayName;

const formattedFile = {};
formattedFile.downloadUrl = downloadUrl;
formattedFile.downloadLabel = downloadLabel;
return formattedFile;
```

### Shorthand copying — spread, rest, destructuring

`{...file, displayName}` compresses "copy every field, then override two of them" into
four characters the reader has to mentally expand back out — and worse, it hides
*which* fields exist behind a symbol instead of showing them. Copy explicitly, field by
field or index by index, even though it's longer. Longer-and-explicit beats
short-and-opaque here, every time.

```js
// Fails: hides which fields exist and how many there are behind three dots —
// the reader has to already know Array.prototype semantics to know what this does.
cursors: [...this.fileCursors]

// Passes: the copy is spelled out, one element at a time. Nothing to expand mentally.
const copiedCursors = [];
for (let i = 0; i < this.fileCursors.length; i++) {
    copiedCursors.push(this.fileCursors[i]);
}
```

### Unexplained guard clauses, short-circuit defaults, and non-obvious symbols

`||`, `??`, `!!`, and bare guard-clause returns are legal and sometimes fine to use —
but only with a comment directly above stating exactly what's happening and why, because
none of them are self-evident on a first, literal read.

```js
// A newer request has been issued since this one was sent — this response
// is stale, so ignore it entirely.
if (request !== this.projectRequest) {
    return;
}

// Default to an empty array if the server didn't send a "rows" field, so the
// UI can always safely loop over projectRows without extra null checks.
this.projectRows = page.rows || [];
```

Avoid `!!x` specifically — use `Boolean(x)` or a plain `if/else`, since `!!` reads as
a typo before it reads as intentional.

### Compound conditions

`a && b || c && !d` asks the reader to hold operator precedence, four separate truth
values, and the overall result all at once. Name each atomic check first —
`isX`, `hasX`, `canX`, `shouldX` — then combine the *names* in the final condition.

```apex
// Fails: two conditions and a negation, all inline.
if (recordId != null && !recordId.getSObjectType().getDescribe().isAccessible()) {
    throw new AuraHandledException('You do not have access to this record.');
}

// Passes: each atomic check is named and readable on its own before they're combined.
Boolean isRecordIdProvided = (recordId != null);

Boolean isObjectAccessibleToUser = false;
if (isRecordIdProvided) {
    Schema.DescribeSObjectResult objectDescribe = recordId.getSObjectType().getDescribe();
    isObjectAccessibleToUser = objectDescribe.isAccessible();
}

Boolean isRecordProvidedButNotAccessible = isRecordIdProvided && !isObjectAccessibleToUser;
if (isRecordProvidedButNotAccessible) {
    throw new AuraHandledException('You do not have access to this record.');
}
```

---

## 5. Two failures that look opposite but are the same failure

**Too terse** hides logic by cramming it into one line. **Too fragmented** — splitting
one feature into six or seven tiny single-use helper functions — hides logic by
scattering it across files the reader has to keep jumping between, holding the earlier
fragments in memory while they chase the next one down. Both do the same thing: they
take a single line of reasoning the reader could verify in one pass and turn it into
something that requires *navigation* before it can be *read*.

The fix is the same in both directions: 2–4 well-scoped functions per feature is the
right size for most things. A shared function is only justified by genuine reuse —
one generic formatter called from several real places — never by mechanically
extracting a block just because it's there, and never as a "half specific, half
general" function that forces unrelated call sites through the same body with flags.
A thin wrapper that exists only to shave lines off a caller forces a pointless jump;
if a wrapper has to exist, comment its defaults inline so the reader never has to open
the function it wraps just to learn what fixed values it's supplying.

```apex
// Fails: nothing here says what "recent projects" means — the reader has to go
// open getProjectsSorted() and reverse-engineer six positional arguments to find out.
@AuraEnabled
public static ProjectPage getProjects(String searchTerm, Datetime afterCreatedDate, Id afterId) {
    return getProjectsSorted(searchTerm, null, 'createdDate', 'desc', afterCreatedDate, null, afterId, 0);
}

// Passes: the defaults are named and explained inline. No jump required.
// Public entry point for the default "recent projects" view.
// Delegates to getProjectsSorted() with these fixed defaults:
//   sortField = 'createdDate', sortDirection = 'desc', pageSize = 0 (sorter's own default).
// Callers needing a different sort/page size should call getProjectsSorted() directly.
@AuraEnabled
public static ProjectPage getProjects(String searchTerm, Datetime afterCreatedDate, Id afterId) {
    String defaultSortField = 'createdDate';
    String defaultSortDirection = 'desc';
    Integer defaultPageSize = 0;
    return getProjectsSorted(searchTerm, null, defaultSortField, defaultSortDirection, afterCreatedDate, null, afterId, defaultPageSize);
}
```

---

## 6. Naming and comments

A good name is a comment that's always visible and never goes stale — prefer fixing
clarity with a better name before reaching for a comment. Comments earn their place
where a name alone can't carry the "why": guard clauses, defaults, anything using a
symbol that isn't self-evident on a literal read.

Every function gets a header comment stating its purpose, each parameter (name and
expected shape — yes, even in dynamically typed languages where the signature doesn't
say this for you), and the return shape, whenever that return shape is a nontrivial
object rather than an obvious primitive.

```js
// Converts a raw byte count into a human-readable label such as "512 B" or "3.4 MB".
// Input:  bytes (Number) — raw size in bytes; may be 0, null, or undefined.
// Output: String — the formatted size with its unit.
formatSize(bytes) { ... }
```

Without this, the reader hits every line with zero expectation set, meaning every line
is read at the expensive "build understanding from scratch" speed instead of the cheap
"confirm what I already expected" speed — there's no anchor to measure the code against,
just a forced, linear, unaided decode.

---

## 7. Formatting conventions

These don't need deep justification — they're just the mechanical form the reasoning
above implies:

- Braces on their own lines for every `if/else`/loop, even single statements — never
  `if (x) return;` on one line.
- One variable declaration per line. Never combine statements on one line.
- Boolean variables read as a yes/no question: `isX`, `hasX`, `canX`, `shouldX`, `wasX`.
- Never use a language/platform feature that's deprecated or scheduled for deprecation,
  no matter how convenient — verify against current docs if you're not certain from
  memory alone.

---

## 8. Before you consider any function done, ask yourself

- If I strip this back to a stranger's first read, does every line confirm a prediction
  instead of forcing one to be built from scratch?
- Is there a line where understanding it requires me to also go read something else
  first?
- Did I compress anything purely to save characters, with no reading benefit at all?
- Is there more than one unresolved thing happening on any single line?
- Would this function's logic survive being read once, top to bottom, without needing
  to jump anywhere else?
- Did I use this pattern because it's genuinely the clearest way to express the idea —
  or just because the language happened to offer a shorter way to write it?

If the honest answer to that last one is "just because it was shorter," expand it.
That's the whole document, really — everything above is just that question, worked
out in enough detail to recognize when you're about to fail it.
