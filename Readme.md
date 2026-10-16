# 101572409_COMP3123-exec06

RESTful CRUD API for a note-taking app, using Node.js, Express 5 and MongoDB (Mongoose 8).

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and paste your MongoDB Atlas connection string into `DB_URL`.
   In Atlas, also allow your IP under **Network Access**, or the connection will time out.
3. `npm start` (same as `node server.js`). The server runs at http://localhost:8081.

`npm test` runs the route tests with an in-memory stand-in for the database, so it works without Atlas.

## Endpoints
| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/` | none | welcome page | |
| POST | `/notes` | `{ "content": { ...note } }` | 201 + the saved note | 400 if `content` is missing, `noteTitle` is missing, `priority` is not HIGH/MEDIUM/LOW, or a date is invalid |
| GET | `/notes` | none | 200 + all notes, newest first | |
| GET | `/notes/:noteId` | none | 200 + the note | 400 bad id, 404 not found |
| PUT | `/notes/:noteId` | `{ "content": { ...fields to change } }` | 200 + the updated note | 400 bad id or invalid fields, 404 not found |
| DELETE | `/notes/:noteId` | none | 200 + the deleted note | 400 bad id, 404 not found |

Note fields: `noteTitle` (required), `noteDescription`, `priority` (HIGH / MEDIUM / LOW, default MEDIUM, case-insensitive), `dateAdded` and `dateUpdated` (default to now). On PUT, `dateAdded` is never changed and `dateUpdated` is set to now unless you send one.

## Fixes made to the starter code
- `NoteRoutes.js` required `../models/Notes.js`, but the file is `NotesModel.js`.
- `NotesModel.js` had no schema and exported nothing.
- The note routes were never mounted in `server.js`; now `app.use('/', noteRoutes)`.
- GET and DELETE checked `req.body.content`, which those requests never send, so they always returned 400. That check is now only on POST and PUT.
- `findByIdAndRemove` (linked in the TODO) was removed in Mongoose 8; replaced with `findByIdAndDelete`.
- `useNewUrlParser` / `useUnifiedTopology` were removed; they do nothing since Mongoose 6.
- The listen message said port 3000 while the server used 8081.
- `DB_URL` now comes from a `.env` file (via `dotenv`) so the Atlas password is never committed to GitHub.
- The priority enum spelling in the TODO ("MEDUIM") is `MEDIUM` here.

## Screenshots
Postman screenshots of each endpoint are in `screenshots/`.

---

# Original lab instructions

# Week06 Exercise - Notes Application

Build a Restful CRUD API for a simple Note-Taking application using Node.js, Express and MongoDB.

## Steps to Setup

1. Install dependencies

```bash
npm install
```
2. Fix error and write Note API code

3. Run Server

```bash
node server.js
```

4. Optionally implement Docker OR vercel Hosting

5. Test all API on Postman and take screenshots at  URL <http://localhost:8081>

## Sample Note Payload

```json
{
    "content" : {
        "noteTitle": "Sample Note Title",
        "noteDescription": "Sample Note Description",
        "priority": "HIGH",
        "dateAdded": "06/Oct/2025",
        "dateUpdated": "06/Oct/2025"
    }
}
```