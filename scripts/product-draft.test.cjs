const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
require("./support/load-ts.cjs");

const temporary = fs.mkdtempSync(
  path.join(os.tmpdir(), "techstyles-product-draft-"),
);
process.env.TECHSTYLES_DATA_DIR = path.join(temporary, "data");
after(() => fs.rmSync(temporary, { recursive: true, force: true }));
const { emptyProduct } = require("../src/lib/store.ts");
const { createProductDraft } = require("../src/lib/product-draft.ts");

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

// Move to the next event-loop turn without sleeps or real network requests.
const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup(initial = emptyProduct()) {
  const patches = [],
    loads = [],
    states = [];
  const draft = createProductDraft(
    initial,
    {
      patch(id, data) {
        const call = { id, data, ...deferred() };
        patches.push(call);
        return call.promise;
      },
      load(id) {
        const call = { id, ...deferred() };
        loads.push(call);
        return call.promise;
      },
    },
    (state) => states.push(state),
  );
  return { initial, draft, patches, loads, states };
}

function material(id, name = "Cotton") {
  return { id, name, composition: "", weight: "", supplier: "", placement: "" };
}

test("optimistic product and saving status are published synchronously", async () => {
  const { initial, draft, patches, states } = setup();
  const save = draft.save({ name: "Edited" });
  assert.equal(states.length, 1);
  assert.equal(states[0], draft.state);
  assert.equal(draft.state.product.name, "Edited");
  assert.equal(initial.name, "Untitled product");
  assert.equal(draft.state.status, "saving");
  assert.equal(draft.state.error, "");
  await flush();
  assert.equal(patches[0].id, initial.id);
  assert.deepEqual(patches[0].data, { name: "Edited" });
  const server = { ...draft.state.product, updatedAt: "server" };
  patches[0].resolve(server);
  await save;
  assert.equal(draft.state.product, server);
  assert.equal(draft.state.status, "saved");
});

test("PATCH requests are serialized and an older response cannot replace newer optimistic state", async () => {
  const { initial, draft, patches } = setup();
  const first = draft.save({ name: "First" });
  await flush();
  const second = draft.save({ description: "Second" });
  const optimistic = draft.state.product;
  await flush();
  assert.equal(patches.length, 1);
  patches[0].resolve({ ...initial, name: "First", updatedAt: "old response" });
  await first;
  await flush();
  assert.equal(patches.length, 2);
  assert.equal(draft.state.product, optimistic);
  assert.equal(draft.state.status, "saving");
  patches[1].resolve({ ...optimistic, updatedAt: "new response" });
  await second;
  assert.equal(draft.state.product.name, "First");
  assert.equal(draft.state.product.description, "Second");
  assert.equal(draft.state.status, "saved");
});

test("rapid edits to different fields and different rows survive in the second PATCH and final product", async () => {
  const initial = {
    ...emptyProduct(),
    materials: [material("a"), material("b", "Linen")],
  };
  const { draft, patches } = setup(initial);
  const first = draft.save(
    {
      materials: initial.materials.map((row) =>
        row.id === "a" ? { ...row, name: "Wool" } : row,
      ),
    },
    initial,
  );
  await flush();
  const second = draft.save(
    {
      materials: initial.materials.map((row) =>
        row.id === "a" ? { ...row, weight: "200" } : { ...row, name: "Silk" },
      ),
    },
    initial,
  );
  const expected = [
    { ...material("a", "Wool"), weight: "200" },
    material("b", "Silk"),
  ];
  assert.deepEqual(draft.state.product.materials, expected);
  patches[0].resolve({ ...initial, ...patches[0].data });
  await first;
  await flush();
  assert.deepEqual(patches[1].data.materials, expected);
  patches[1].resolve({ ...initial, ...patches[1].data });
  await second;
  assert.deepEqual(draft.state.product.materials, expected);
  assert.deepEqual(initial.materials, [material("a"), material("b", "Linen")]);
});

test("a concurrently added row survives an edit based on an older list", async () => {
  const initial = { ...emptyProduct(), materials: [material("a")] };
  const { draft, patches } = setup(initial);
  const first = draft.save(
    { materials: [...initial.materials, material("new")] },
    initial,
  );
  await flush();
  const second = draft.save({ materials: [material("a", "Edited")] }, initial);
  const expected = [material("a", "Edited"), material("new")];
  patches[0].resolve({ ...initial, ...patches[0].data });
  await first;
  await flush();
  assert.deepEqual(patches[1].data.materials, expected);
  patches[1].resolve({ ...initial, ...patches[1].data });
  await second;
  assert.deepEqual(draft.state.product.materials, expected);
});

for (const key of [
  "materials",
  "measurements",
  "comments",
  "colors",
  "artworks",
  "attachments",
  "samples",
  "annotations",
]) {
  test(`row merge preserves concurrent fields, additions, incoming order and removals for ${key}`, async () => {
    // The merge is structural and compares every enumerable field, including nested values.
    const a = { id: "a", name: "Before", values: { M: "10" } };
    const b = { id: "b", name: "Remove" };
    const initial = { ...emptyProduct(), [key]: [a, b] };
    const { draft, patches } = setup(initial);
    const first = draft.save(
      { [key]: [{ ...a, name: "Concurrent" }, b, { id: "concurrent" }] },
      initial,
    );
    await flush();
    const second = draft.save(
      { [key]: [{ id: "incoming" }, { ...a, values: { M: "20" } }] },
      initial,
    );
    const expected = [
      { id: "incoming" },
      { ...a, name: "Concurrent", values: { M: "20" } },
      { id: "concurrent" },
    ];
    assert.deepEqual(draft.state.product[key], expected);
    patches[0].resolve({ ...initial, ...patches[0].data });
    await first;
    await flush();
    assert.deepEqual(patches[1].data[key], expected);
    patches[1].resolve({ ...initial, ...patches[1].data });
    await second;
    assert.deepEqual(draft.state.product[key], expected);
  });
}

test("merge keeps nested fields atomic and takes incoming rows absent from current as-is", async () => {
  const row = {
    id: "a",
    name: "Chest",
    tolerance: "1",
    values: { S: "10", M: "20" },
  };
  const initial = { ...emptyProduct(), measurements: [row] };
  const { draft, patches } = setup(initial);
  const first = draft.save(
    { measurements: [{ ...row, values: { S: "11", M: "20" } }] },
    initial,
  );
  const second = draft.save(
    { measurements: [{ ...row, values: { S: "10", M: "21" } }] },
    initial,
  );
  assert.deepEqual(draft.state.product.measurements[0].values, {
    S: "10",
    M: "21",
  });
  await flush();
  patches[0].resolve(initial);
  await first;
  await flush();
  patches[1].resolve({ ...initial, ...patches[1].data });
  await second;
  const third = draft.save({ measurements: [] });
  const fourth = draft.save({ measurements: [row] }, initial);
  assert.deepEqual(draft.state.product.measurements, [row]);
  await flush();
  patches[2].resolve({ ...initial, measurements: [] });
  await third;
  await flush();
  patches[3].resolve(initial);
  await fourth;
});

test("omitting base uses the current draft, allowing an intentional field revert", async () => {
  const initial = { ...emptyProduct(), materials: [material("a")] };
  const { draft, patches } = setup(initial);
  const first = draft.save({ materials: [material("a", "Edited")] });
  const second = draft.save({ materials: [material("a")] });
  assert.equal(draft.state.product.materials[0].name, "Cotton");
  await flush();
  patches[0].resolve({ ...initial, ...patches[0].data });
  await first;
  await flush();
  assert.equal(patches[1].data.materials[0].name, "Cotton");
  patches[1].resolve(initial);
  await second;
});

test("A resolves then B fails: optimistic edits and server message stay without reloading", async () => {
  const { initial, draft, patches, loads } = setup();
  const first = draft.save({ name: "Stored" });
  await flush();
  const second = draft.save({ description: "Unsaved" });
  const optimistic = draft.state.product;
  const failure = new Error("Server refused description");
  const rejected = assert.rejects(second, (error) => error === failure);
  patches[0].resolve({ ...initial, name: "Stored" });
  await first;
  await flush();
  patches[1].reject(failure);
  await rejected;
  assert.deepEqual(draft.state, {
    product: optimistic,
    status: "error",
    error: failure.message,
    unsaved: true,
  });
  assert.equal(loads.length, 0);
});

test("a failure does not block queued saves and status stays saving until drain", async () => {
  const { draft, patches, loads, states } = setup();
  const first = draft.save({ name: "Unsaved A" });
  const rejectedFirst = assert.rejects(first, /First failure/);
  await flush();
  const second = draft.save({ description: "Unsaved B" });
  const rejectedSecond = assert.rejects(second, /Last failure/);
  const optimistic = draft.state.product;
  patches[0].reject(new Error("First failure"));
  await rejectedFirst;
  await flush();
  assert.ok(
    states.some(
      (state) =>
        state.unsaved &&
        state.status === "saving" &&
        state.error === "First failure",
    ),
  );
  assert.equal(patches.length, 2);
  assert.equal(draft.state.status, "saving");
  patches[1].reject(new Error("Last failure"));
  await rejectedSecond;
  assert.deepEqual(draft.state, {
    product: optimistic,
    status: "error",
    error: "Last failure",
    unsaved: true,
  });
  assert.equal(loads.length, 0);
});

test("a later successful save of the same key clears its failure", async () => {
  const { initial, draft, patches, loads } = setup();
  const first = draft.save({ name: "Unsaved" });
  const rejected = assert.rejects(first, /Save failure/);
  await flush();
  patches[0].reject(new Error("Save failure"));
  await rejected;
  const second = draft.save({ name: "Stored" });
  await flush();
  const server = { ...initial, name: "Stored" };
  patches[1].resolve(server);
  await second;
  assert.deepEqual(draft.state, {
    product: server,
    status: "saved",
    error: "",
    unsaved: false,
  });
  assert.equal(loads.length, 0);
});

test("a different-key success overlays the failed key and leaves it dirty for retry", async () => {
  const { initial, draft, patches, loads } = setup();
  const first = draft.save({ name: "Unsaved" });
  const rejected = assert.rejects(first, /Save failure/);
  await flush();
  const second = draft.save({ description: "Stored" });
  patches[0].reject(new Error("Save failure"));
  await rejected;
  await flush();
  const server = { ...initial, description: "Stored" };
  patches[1].resolve(server);
  await second;
  assert.deepEqual(draft.state, {
    product: { ...server, name: "Unsaved" },
    status: "error",
    error: "Save failure",
    unsaved: true,
  });
  assert.equal(loads.length, 0);
  const retry = draft.retry();
  await flush();
  assert.deepEqual(patches[2].data, { name: "Unsaved" });
  patches[2].resolve({ ...server, name: "Unsaved" });
  await retry;
  assert.equal(draft.state.status, "saved");
  assert.equal(draft.state.unsaved, false);
});

for (const outcome of ["resolve", "reject"]) {
  test(`replace during an in-flight save reconciles its ${outcome === "resolve" ? "response" : "failure"} with dirty values preserved`, async () => {
    const { initial, draft, patches, loads } = setup();
    const first = draft.save({ name: "Old save" });
    const completion =
      outcome === "reject" ? assert.rejects(first, /Old failure/) : first;
    await flush();
    const replacement = {
      ...initial,
      name: "Restored",
      shareToken: "new token",
    };
    draft.replace(replacement);
    assert.deepEqual(draft.state, {
      product: replacement,
      status: "saving",
      error: "",
      unsaved: false,
    });
    if (outcome === "resolve")
      patches[0].resolve({ ...initial, name: "Old save" });
    else patches[0].reject(new Error("Old failure"));
    await completion;
    assert.deepEqual(draft.state, {
      product: replacement,
      status: outcome === "resolve" ? "saved" : "error",
      error: outcome === "resolve" ? "" : "Old failure",
      unsaved: outcome === "reject",
    });
    assert.equal(loads.length, 1);
    assert.equal(loads[0].id, initial.id);
    const server = {
      ...replacement,
      description: "Stored after pending PATCH",
    };
    loads[0].resolve(server);
    await flush();
    assert.deepEqual(draft.state, {
      product: server,
      status: outcome === "resolve" ? "saved" : "error",
      error: outcome === "resolve" ? "" : "Old failure",
      unsaved: outcome === "reject",
    });
    assert.equal(loads.length, 1);
  });
}

test("replace supersedes all already queued saves, while a subsequent save can update the replacement", async () => {
  const { initial, draft, patches, loads } = setup();
  const first = draft.save({ name: "Old A" });
  await flush();
  const second = draft.save({ description: "Old B" });
  const replacement = { ...initial, name: "Restored" };
  draft.replace(replacement);
  const third = draft.save({ labels: "New labels" });
  patches[0].resolve({ ...initial, name: "Old A" });
  await first;
  await flush();
  patches[1].resolve({ ...initial, description: "Old B" });
  await second;
  await flush();
  assert.equal(draft.state.product.name, "Restored");
  assert.equal(draft.state.product.labels, "New labels");
  assert.equal(loads.length, 0);
  const server = { ...replacement, labels: "New labels" };
  patches[2].resolve(server);
  await third;
  assert.deepEqual(draft.state, {
    product: server,
    status: "saved",
    error: "",
    unsaved: false,
  });
  assert.equal(loads.length, 1);
  loads[0].resolve(replacement);
  await flush();
  assert.deepEqual(draft.state, {
    product: server,
    status: "saved",
    error: "",
    unsaved: false,
  });
});

for (const change of ["save", "replace"]) {
  test(`failure followed by a newer ${change} preserves unsaved values without recovery`, async () => {
    const { initial, draft, patches, loads } = setup();
    const first = draft.save({ name: "Failed" });
    const rejected = assert.rejects(first, /Failure/);
    await flush();
    patches[0].reject(new Error("Failure"));
    await rejected;
    if (change === "save") {
      const second = draft.save({ name: "Newer" });
      await flush();
      patches[1].resolve({ ...initial, name: "Newer" });
      await second;
      assert.equal(draft.state.product.name, "Newer");
      assert.equal(draft.state.unsaved, false);
    } else {
      draft.replace({
        ...initial,
        name: "Restored",
        labels: "Restored labels",
      });
      assert.equal(draft.state.product.name, "Failed");
      assert.equal(draft.state.product.labels, "Restored labels");
      assert.equal(draft.state.unsaved, true);
      const retry = draft.retry();
      await flush();
      assert.deepEqual(patches[1].data, { name: "Failed" });
      patches[1].resolve({ ...draft.state.product });
      await retry;
      assert.equal(draft.state.unsaved, false);
    }
    assert.equal(loads.length, 0);
  });
}

test("a later same-key success clears a failure without any recovery load", async () => {
  const { initial, draft, patches, loads } = setup();
  const first = draft.save({ name: "Failed" });
  const rejected = assert.rejects(first, /Failure/);
  await flush();
  patches[0].reject(new Error("Failure"));
  await rejected;
  const second = draft.save({ name: "New" });
  await flush();
  const server = { ...initial, name: "New" };
  patches[1].resolve(server);
  await second;
  assert.deepEqual(draft.state, {
    product: server,
    status: "saved",
    error: "",
    unsaved: false,
  });
  assert.equal(loads.length, 0);
});

test("a row added behind an in-flight request survives a third edit from the original render", async () => {
  const initial = { ...emptyProduct(), materials: [material("a")] };
  const { draft, patches } = setup(initial);
  const first = draft.save({ materials: [material("a", "Wool")] }, initial);
  await flush();
  const second = draft.save(
    { materials: [...initial.materials, material("new")] },
    initial,
  );
  const third = draft.save(
    { materials: [{ ...material("a"), weight: "200" }] },
    initial,
  );
  const expected = [
    { ...material("a", "Wool"), weight: "200" },
    material("new"),
  ];
  assert.deepEqual(draft.state.product.materials, expected);
  assert.equal(patches.length, 1);
  patches[0].resolve({ ...initial, ...patches[0].data });
  await first;
  await flush();
  patches[1].resolve({ ...initial, ...patches[1].data });
  await second;
  await flush();
  assert.deepEqual(patches[2].data.materials, expected);
  patches[2].resolve({ ...initial, ...patches[2].data });
  await third;
  assert.deepEqual(draft.state.product.materials, expected);
});

test("an unchanged nested value is compared by JSON value and preserves a concurrent edit", async () => {
  const row = { id: "a", name: "Chest", tolerance: "1", values: { M: "20" } };
  const initial = { ...emptyProduct(), measurements: [row] };
  const { draft, patches } = setup(initial);
  const first = draft.save(
    { measurements: [{ ...row, values: { M: "21" } }] },
    initial,
  );
  await flush();
  const second = draft.save(
    {
      measurements: [
        { ...row, name: "Width", values: structuredClone(row.values) },
      ],
    },
    initial,
  );
  const expected = [{ ...row, name: "Width", values: { M: "21" } }];
  assert.deepEqual(draft.state.product.measurements, expected);
  patches[0].resolve({ ...initial, ...patches[0].data });
  await first;
  await flush();
  assert.deepEqual(patches[1].data.measurements, expected);
  patches[1].resolve({ ...initial, ...patches[1].data });
  await second;
  assert.deepEqual(draft.state.product.measurements, expected);
});

test("an older reconcile cannot overwrite a newer completed save", async () => {
  const { initial, draft, patches, loads } = setup();
  const first = draft.save({ name: "Old" });
  await flush();
  draft.replace(initial);
  patches[0].resolve(initial);
  await first;
  const second = draft.save({ name: "Stored" });
  await flush();
  const server = { ...initial, name: "Stored" };
  patches[1].resolve(server);
  await second;
  loads[0].resolve(initial);
  await flush();
  assert.deepEqual(draft.state, {
    product: server,
    status: "saved",
    error: "",
    unsaved: false,
  });
});

test("overlapping reconciles retain the newest product and dirty failure message", async () => {
  const { initial, draft, patches, loads } = setup();
  const first = draft.save({ name: "First" });
  const rejectedFirst = assert.rejects(first, /First failure/);
  await flush();
  draft.replace(initial);
  patches[0].reject(new Error("First failure"));
  await rejectedFirst;
  const second = draft.save({ description: "Second" });
  const rejectedSecond = assert.rejects(second, /Second failure/);
  await flush();
  draft.replace({ ...initial, updatedAt: "New replacement" });
  patches[1].reject(new Error("Second failure"));
  await rejectedSecond;
  const server = { ...initial, updatedAt: "Newest server data" };
  loads[1].resolve(server);
  await flush();
  loads[0].resolve(initial);
  await flush();
  assert.deepEqual(draft.state, {
    product: { ...server, description: "" },
    status: "error",
    error: "Second failure",
    unsaved: true,
  });
});

test("an empty failure message still leaves status error", async () => {
  const { draft, patches, loads } = setup();
  const first = draft.save({ name: "Failed" });
  const error = new Error("");
  const rejected = assert.rejects(first, (failure) => failure === error);
  await flush();
  patches[0].reject(error);
  await rejected;
  assert.equal(draft.state.status, "error");
  assert.equal(loads.length, 0);
  assert.equal(draft.state.unsaved, true);
});

test("replace with no pending saves does not reload", async () => {
  const { initial, draft, patches, loads } = setup();
  const replacement = { ...initial, name: "Restored" };
  draft.replace(replacement);
  await flush();
  assert.equal(patches.length, 0);
  assert.equal(loads.length, 0);
  assert.deepEqual(draft.state, {
    product: replacement,
    status: "saved",
    error: "",
    unsaved: false,
  });
});

test("replacement reconciliation failure keeps the replaced product without an error", async () => {
  const { initial, draft, patches, loads } = setup();
  const save = draft.save({ name: "Old save" });
  await flush();
  const replacement = { ...initial, name: "Restored" };
  draft.replace(replacement);
  patches[0].resolve({ ...initial, name: "Old save" });
  await save;
  assert.equal(loads.length, 1);
  loads[0].reject(new Error("Reconcile failed"));
  await flush();
  assert.deepEqual(draft.state, {
    product: replacement,
    status: "saved",
    error: "",
    unsaved: false,
  });
});

for (const outcome of ["resolve", "reject"]) {
  test(`a failure after replacement is retained when the reconcile ${outcome}s`, async () => {
    const { initial, draft, patches, loads } = setup();
    const save = draft.save({ name: "Old save" });
    const rejected = assert.rejects(save, /New failure/);
    await flush();
    draft.replace({ ...initial, name: "Restored" });
    const optimistic = draft.state.product;
    patches[0].reject(new Error("New failure"));
    await rejected;
    assert.equal(loads.length, 1);
    const server = { ...initial, labels: "Server labels" };
    if (outcome === "resolve") loads[0].resolve(server);
    else loads[0].reject(new Error("Reload failure"));
    await flush();
    assert.deepEqual(draft.state, {
      product:
        outcome === "resolve" ? { ...server, name: "Restored" } : optimistic,
      status: "error",
      error: "New failure",
      unsaved: true,
    });
    assert.equal(loads.length, 1);
  });
}

test("replacement preserves an earlier failure and overlays it during pending-save reconciliation", async () => {
  const { initial, draft, patches, loads } = setup();
  const first = draft.save({ name: "Failed" });
  const rejected = assert.rejects(first, /Old failure/);
  await flush();
  const second = draft.save({ description: "Old queued save" });
  patches[0].reject(new Error("Old failure"));
  await rejected;
  await flush();
  draft.replace({ ...initial, name: "Restored" });
  assert.equal(draft.state.error, "Old failure");
  assert.equal(draft.state.product.name, "Failed");
  const server = {
    ...initial,
    name: "Restored",
    description: "Old queued save",
  };
  patches[1].resolve(server);
  await second;
  assert.equal(loads.length, 1);
  loads[0].resolve(server);
  await flush();
  assert.deepEqual(draft.state, {
    product: { ...server, name: "Failed" },
    status: "error",
    error: "Old failure",
    unsaved: true,
  });
});

for (const change of ["save", "replace"]) {
  test(`replacement reconciliation cannot overwrite a newer ${change} after drain`, async () => {
    const { initial, draft, patches, loads } = setup();
    const first = draft.save({ name: "Old save" });
    await flush();
    const replacement = { ...initial, name: "Restored" };
    draft.replace(replacement);
    patches[0].resolve({ ...initial, name: "Old save" });
    await first;
    assert.equal(loads.length, 1);
    const expected = { ...replacement, name: "Newer" };
    if (change === "save") {
      const second = draft.save({ name: "Newer" });
      await flush();
      patches[1].resolve(expected);
      await second;
    } else draft.replace(expected);
    loads[0].resolve({ ...replacement, description: "Stale reconciliation" });
    await flush();
    assert.deepEqual(draft.state, {
      product: expected,
      status: "saved",
      error: "",
      unsaved: false,
    });
    assert.equal(loads.length, 1);
  });
}

test("failure after replacement followed by a different-key success stays dirty and ignores stale reconcile", async () => {
  const { initial, draft, patches, loads } = setup();
  const first = draft.save({ name: "Old save" });
  await flush();
  const replacement = { ...initial, name: "Restored" };
  draft.replace(replacement);
  const second = draft.save({ description: "Unsaved" });
  const rejected = assert.rejects(second, /New failure/);
  patches[0].resolve(initial);
  await first;
  await flush();
  patches[1].reject(new Error("New failure"));
  // Enqueue another edit before the failed request's queue has drained.
  const third = draft.save({ labels: "New labels" });
  await rejected;
  await flush();
  assert.equal(loads.length, 0);
  const server = { ...replacement, labels: "New labels" };
  patches[2].resolve(server);
  await third;
  assert.equal(loads.length, 1);
  loads[0].resolve(server);
  await flush();
  assert.deepEqual(draft.state, {
    product: { ...server, description: "Unsaved" },
    status: "error",
    error: "New failure",
    unsaved: true,
  });
});

async function failSave(context, data, message = "Save failed") {
  const index = context.patches.length;
  const operation = context.draft.save(data);
  const rejected = assert.rejects(operation, { message });
  await flush();
  context.patches[index].reject(new Error(message));
  await rejected;
}

test("retry sends only dirty keys and success clears unsaved state", async () => {
  const context = setup();
  const { initial, draft, patches, loads } = context;
  await failSave(context, {
    name: "Unsaved",
    description: "Unsaved description",
  });
  const optimistic = draft.state.product;
  assert.deepEqual(draft.state, {
    product: optimistic,
    status: "error",
    error: "Save failed",
    unsaved: true,
  });
  assert.equal(loads.length, 0);
  const retry = draft.retry();
  assert.equal(draft.state.status, "saving");
  await flush();
  assert.deepEqual(patches[1].data, {
    name: "Unsaved",
    description: "Unsaved description",
  });
  assert.equal(patches[1].id, initial.id);
  patches[1].resolve({ ...optimistic, updatedAt: "Retry saved" });
  await retry;
  assert.deepEqual(draft.state, {
    product: { ...optimistic, updatedAt: "Retry saved" },
    status: "saved",
    error: "",
    unsaved: false,
  });
});

test("retry uses newer dirty values after another edit fails", async () => {
  const context = setup();
  const { draft, patches } = context;
  await failSave(context, { name: "Old" });
  await failSave(context, { name: "Newer" }, "New edit failed");
  const retry = draft.retry();
  await flush();
  assert.deepEqual(patches[2].data, { name: "Newer" });
  patches[2].resolve({ ...draft.state.product });
  await retry;
  assert.equal(draft.state.product.name, "Newer");
  assert.equal(draft.state.unsaved, false);
});

test("retry waits behind an in-flight save and builds its payload when sent", async () => {
  const context = setup();
  const { initial, draft, patches } = context;
  await failSave(context, { name: "Old" });
  const blocker = draft.save({ description: "Stored description" });
  await flush();
  const retry = draft.retry();
  const newer = draft.save({ name: "Newest" });
  await flush();
  assert.equal(patches.length, 2);
  patches[1].resolve({ ...initial, description: "Stored description" });
  await blocker;
  await flush();
  assert.deepEqual(patches[2].data, { name: "Newest" });
  assert.equal(patches.length, 3);
  assert.equal(draft.state.product.name, "Newest");
  const server = {
    ...initial,
    name: "Newest",
    description: "Stored description",
  };
  patches[2].resolve(server);
  await retry;
  await flush();
  assert.equal(draft.state.status, "saving");
  patches[3].resolve(server);
  await newer;
  assert.deepEqual(draft.state, {
    product: server,
    status: "saved",
    error: "",
    unsaved: false,
  });
});

test("two quick retries send only one PATCH after the first succeeds", async () => {
  const context = setup();
  const { draft, patches } = context;
  await failSave(context, { name: "Unsaved" });
  const first = draft.retry();
  const second = draft.retry();
  await flush();
  assert.equal(patches.length, 2);
  assert.deepEqual(patches[1].data, { name: "Unsaved" });
  patches[1].resolve({ ...draft.state.product });
  await Promise.all([first, second]);
  assert.equal(patches.length, 2);
  assert.equal(draft.state.unsaved, false);
  assert.equal(draft.state.status, "saved");
});

test("a queued retry sends nothing when a same-key save succeeds first", async () => {
  const context = setup();
  const { draft, patches } = context;
  await failSave(context, { name: "Unsaved" });
  const save = draft.save({ name: "Newest" });
  await flush();
  const retry = draft.retry();
  const server = { ...draft.state.product, updatedAt: "Canonical response" };
  patches[1].resolve(server);
  await Promise.all([save, retry]);
  assert.equal(patches.length, 2);
  assert.equal(draft.state.product, server);
  assert.equal(draft.state.unsaved, false);
});

test("a retry with no dirty keys does not hide a pending save response", async () => {
  const { draft, patches } = setup();
  const save = draft.save({ name: "Edited" });
  await flush();
  const retry = draft.retry();
  const server = { ...draft.state.product, updatedAt: "Canonical response" };
  patches[0].resolve(server);
  await Promise.all([save, retry]);
  assert.equal(patches.length, 1);
  assert.equal(draft.state.product, server);
  assert.equal(draft.state.status, "saved");
});

test("retry response cannot overwrite a newer same-key edit whose save then fails", async () => {
  const context = setup();
  const { draft, patches } = context;
  await failSave(context, { name: "Old" });
  const retry = draft.retry();
  await flush();
  const oldResponse = { ...draft.state.product };
  const newer = draft.save({ name: "Newest" });
  const rejected = assert.rejects(newer, /Newest failed/);
  patches[1].resolve(oldResponse);
  await retry;
  await flush();
  assert.equal(draft.state.product.name, "Newest");
  assert.equal(draft.state.unsaved, true);
  patches[2].reject(new Error("Newest failed"));
  await rejected;
  assert.deepEqual(draft.state, {
    product: { ...oldResponse, name: "Newest" },
    status: "error",
    error: "Newest failed",
    unsaved: true,
  });
  const again = draft.retry();
  await flush();
  assert.deepEqual(patches[3].data, { name: "Newest" });
  patches[3].resolve({ ...draft.state.product });
  await again;
  assert.equal(draft.state.unsaved, false);
});

test("an earlier-built success cannot clear a newer-built retry failure", async () => {
  const context = setup();
  const { initial, draft, patches } = context;
  await failSave(context, { name: "Old" });
  const blocker = draft.save({ labels: "Stored labels" });
  await flush();
  const retry = draft.retry();
  const rejected = assert.rejects(retry, /Retry failed/);
  const earlierBuilt = draft.save({ name: "Newest" });
  patches[1].resolve({ ...initial, labels: "Stored labels" });
  await blocker;
  await flush();
  assert.deepEqual(patches[2].data, { name: "Newest" });
  patches[2].reject(new Error("Retry failed"));
  await rejected;
  await flush();
  const server = { ...initial, name: "Newest", labels: "Stored labels" };
  patches[3].resolve(server);
  await earlierBuilt;
  assert.deepEqual(draft.state, {
    product: server,
    status: "error",
    error: "Retry failed",
    unsaved: true,
  });
  const again = draft.retry();
  await flush();
  assert.deepEqual(patches[4].data, { name: "Newest" });
  patches[4].resolve(server);
  await again;
  assert.equal(draft.state.unsaved, false);
});

test("a successful older payload does not clear a key edited again to the same value", async () => {
  const context = setup();
  const { draft, patches } = context;
  await failSave(context, { name: "Unsaved" });
  const first = draft.save({ name: "Newest" });
  await flush();
  const second = draft.save({ name: "Newest" });
  const rejected = assert.rejects(second, /Latest failure/);
  patches[1].resolve({ ...draft.state.product });
  await first;
  await flush();
  assert.equal(draft.state.unsaved, true);
  patches[2].reject(new Error("Latest failure"));
  await rejected;
  assert.equal(draft.state.unsaved, true);
  assert.equal(draft.state.error, "Latest failure");
});

test("failed retry preserves every dirty key with its new error message", async () => {
  const context = setup();
  const { draft, patches, loads } = context;
  await failSave(context, { name: "Unsaved", labels: "Unsaved labels" });
  const optimistic = draft.state.product;
  const retry = draft.retry();
  const rejected = assert.rejects(retry, /Retry refused/);
  await flush();
  patches[1].reject(new Error("Retry refused"));
  await rejected;
  assert.deepEqual(draft.state, {
    product: optimistic,
    status: "error",
    error: "Retry refused",
    unsaved: true,
  });
  assert.equal(loads.length, 0);
  const again = draft.retry();
  await flush();
  assert.deepEqual(patches[2].data, {
    name: "Unsaved",
    labels: "Unsaved labels",
  });
  patches[2].resolve({ ...optimistic });
  await again;
  assert.equal(draft.state.unsaved, false);
});

test("two retries after a failure send only the keys that remain dirty at each send", async () => {
  const context = setup();
  const { draft, patches } = context;
  await failSave(context, { name: "Unsaved" });
  const first = draft.retry();
  const rejected = assert.rejects(first, /First retry failed/);
  const second = draft.retry();
  await flush();
  patches[1].reject(new Error("First retry failed"));
  await rejected;
  await flush();
  assert.deepEqual(patches[2].data, { name: "Unsaved" });
  patches[2].resolve({ ...draft.state.product });
  await second;
  assert.equal(draft.state.status, "saved");
  assert.equal(draft.state.unsaved, false);
});

for (const outcome of ["resolve", "reject"]) {
  test(`dirty values survive replace during pending saves and reconcile ${outcome}`, async () => {
    const context = setup();
    const { initial, draft, patches, loads } = context;
    await failSave(context, {
      name: "Unsaved",
      materials: [material("dirty")],
    });
    const pending = draft.save({ labels: "Pending labels" });
    await flush();
    draft.replace({
      ...initial,
      name: "Restored",
      materials: [],
      description: "Restored description",
    });
    assert.equal(draft.state.product.name, "Unsaved");
    assert.deepEqual(draft.state.product.materials, [material("dirty")]);
    assert.equal(draft.state.product.description, "Restored description");
    patches[1].resolve({ ...initial, labels: "Pending labels" });
    await pending;
    assert.equal(loads.length, 1);
    const server = {
      ...initial,
      labels: "Pending labels",
      description: "Canonical description",
    };
    if (outcome === "resolve") loads[0].resolve(server);
    else loads[0].reject(new Error("Load failed"));
    await flush();
    assert.equal(draft.state.product.name, "Unsaved");
    assert.deepEqual(draft.state.product.materials, [material("dirty")]);
    assert.equal(draft.state.error, "Save failed");
    assert.equal(draft.state.status, "error");
    const retry = draft.retry();
    await flush();
    assert.deepEqual(patches[2].data, {
      name: "Unsaved",
      materials: [material("dirty")],
    });
    patches[2].resolve({ ...draft.state.product });
    await retry;
    assert.equal(draft.state.unsaved, false);
  });
}

test("a retry started after reconciliation prevents its stale load from publishing", async () => {
  const context = setup();
  const { initial, draft, patches, loads } = context;
  await failSave(context, { name: "Unsaved" });
  const save = draft.save({ labels: "Pending" });
  await flush();
  draft.replace(initial);
  patches[1].resolve(initial);
  await save;
  const retry = draft.retry();
  await flush();
  loads[0].resolve({ ...initial, labels: "Stale load" });
  await flush();
  assert.notEqual(draft.state.product.labels, "Stale load");
  const server = { ...initial, name: "Unsaved", labels: "Retry response" };
  patches[2].resolve(server);
  await retry;
  assert.deepEqual(draft.state, {
    product: server,
    status: "saved",
    error: "",
    unsaved: false,
  });
});
