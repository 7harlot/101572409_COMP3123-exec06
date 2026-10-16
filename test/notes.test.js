// Route tests that run WITHOUT a database: the Mongoose model's database calls are replaced
// with an in-memory Map, but the real schema validation (required, enum, dates) still runs.
// Run with: npm test
const test = require('node:test');
const assert = require('node:assert');
const noteModel = require('../models/NotesModel.js');
const app = require('../server.js');

// ---- In-memory stand-in for the notes collection ----
const fakeNotesCollection = new Map();

noteModel.prototype.save = async function () {
    await this.validate();
    fakeNotesCollection.set(String(this._id), this);
    return this;
};
noteModel.find = () => ({ sort: async () => [...fakeNotesCollection.values()].reverse() });
noteModel.findById = async (noteId) => fakeNotesCollection.get(String(noteId)) || null;
noteModel.findByIdAndUpdate = async (noteId, updatedFields) => {
    const existingNote = fakeNotesCollection.get(String(noteId));
    if (!existingNote) return null;
    existingNote.set(updatedFields);
    await existingNote.validate(); // same effect as runValidators: true
    return existingNote;
};
noteModel.findByIdAndDelete = async (noteId) => {
    const existingNote = fakeNotesCollection.get(String(noteId)) || null;
    fakeNotesCollection.delete(String(noteId));
    return existingNote;
};

// ---- Helpers ----
let baseUrl;
const server = app.listen(0, () => { baseUrl = `http://localhost:${server.address().port}`; });
test.after(() => server.close());

async function callApi(method, path, body, rawBody) {
    const response = await fetch(baseUrl + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined
    });
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: response.status, body: json };
}

const SAMPLE_NOTE = {
    content: {
        noteTitle: 'Sample Note Title',
        noteDescription: 'Sample Note Description',
        priority: 'HIGH',
        dateAdded: '06/Oct/2025',
        dateUpdated: '06/Oct/2025'
    }
};
const MISSING_BUT_VALID_ID = '64b7f0c2a1b2c3d4e5f60718';

// ---- Tests ----
test('full CRUD flow with the sample payload', async () => {
    const created = await callApi('POST', '/notes', SAMPLE_NOTE);
    assert.strictEqual(created.status, 201);
    assert.strictEqual(created.body.noteTitle, 'Sample Note Title');
    assert.strictEqual(created.body.priority, 'HIGH');
    assert.ok(created.body.dateAdded.startsWith('2025-10-06'));
    const noteId = created.body._id;

    const listed = await callApi('GET', '/notes');
    assert.strictEqual(listed.status, 200);
    assert.ok(listed.body.some((note) => note._id === noteId));

    const fetched = await callApi('GET', `/notes/${noteId}`);
    assert.strictEqual(fetched.status, 200);
    assert.strictEqual(fetched.body._id, noteId);

    const updated = await callApi('PUT', `/notes/${noteId}`, { content: { noteTitle: 'Edited', priority: 'low' } });
    assert.strictEqual(updated.status, 200);
    assert.strictEqual(updated.body.noteTitle, 'Edited');
    assert.strictEqual(updated.body.priority, 'LOW');
    assert.ok(updated.body.dateAdded.startsWith('2025-10-06'), 'dateAdded must not change');
    assert.ok(new Date(updated.body.dateUpdated) > new Date('2025-10-06'), 'dateUpdated is refreshed');

    const deleted = await callApi('DELETE', `/notes/${noteId}`);
    assert.strictEqual(deleted.status, 200);
    assert.strictEqual((await callApi('GET', `/notes/${noteId}`)).status, 404);
});

test('defaults: priority MEDIUM and dates set to now', async () => {
    const created = await callApi('POST', '/notes', { content: { noteTitle: 'Only a title' } });
    assert.strictEqual(created.status, 201);
    assert.strictEqual(created.body.priority, 'MEDIUM');
    assert.ok(Date.now() - new Date(created.body.dateAdded) < 5000);
});

test('validation errors return 400', async () => {
    assert.strictEqual((await callApi('POST', '/notes', {})).status, 400);
    assert.strictEqual((await callApi('POST', '/notes', { content: 'text' })).status, 400);
    assert.strictEqual((await callApi('POST', '/notes', { content: { noteDescription: 'no title' } })).status, 400);
    assert.strictEqual((await callApi('POST', '/notes', { content: { noteTitle: 'x', priority: 'URGENT' } })).status, 400);
    assert.strictEqual((await callApi('POST', '/notes', { content: { noteTitle: 'x', dateAdded: 'not a date' } })).status, 400);
    assert.strictEqual((await callApi('POST', '/notes', undefined, '{bad json')).status, 400);
});

test('client cannot choose its own _id', async () => {
    const created = await callApi('POST', '/notes', { content: { noteTitle: 'x', _id: MISSING_BUT_VALID_ID } });
    assert.notStrictEqual(created.body._id, MISSING_BUT_VALID_ID);
});

test('bad or unknown ids', async () => {
    for (const method of ['GET', 'DELETE']) {
        assert.strictEqual((await callApi(method, '/notes/not-an-id')).status, 400);
        assert.strictEqual((await callApi(method, `/notes/${MISSING_BUT_VALID_ID}`)).status, 404);
    }
    assert.strictEqual((await callApi('PUT', '/notes/not-an-id', { content: { noteTitle: 'x' } })).status, 400);
    assert.strictEqual((await callApi('PUT', `/notes/${MISSING_BUT_VALID_ID}`, { content: { noteTitle: 'x' } })).status, 404);
    assert.strictEqual((await callApi('PUT', `/notes/${MISSING_BUT_VALID_ID}`, {})).status, 400);
});

test('home page and unknown routes', async () => {
    assert.strictEqual((await callApi('GET', '/')).status, 200);
    assert.strictEqual((await callApi('GET', '/nope')).status, 404);
});
