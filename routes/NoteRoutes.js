const mongoose = require('mongoose');
const express = require('express');
const noteModel = require('../models/NotesModel.js');

const noteRoutes = express.Router();

// Fields a client is allowed to set. Anything else in the body (like _id) is ignored.
const EDITABLE_FIELDS = ['noteTitle', 'noteDescription', 'priority', 'dateAdded', 'dateUpdated'];

// Copies only the editable fields out of req.body.content
function pickNoteFields(content) {
    const noteFields = {};
    for (const fieldName of EDITABLE_FIELDS) {
        if (content[fieldName] !== undefined) {
            noteFields[fieldName] = content[fieldName];
        }
    }
    return noteFields;
}

// POST and PUT need a { "content": { ... } } object in the body (see the sample payload in Readme.md)
function hasNoteContent(req) {
    const content = req.body && req.body.content;
    return content !== null && typeof content === 'object' && !Array.isArray(content);
}

// Turns a Mongoose validation/cast error into a 400 response; returns false for any other error
function sendClientError(error, res) {
    if (error instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(error.errors).map((fieldError) => fieldError.message);
        res.status(400).send({ message: 'Note is invalid', errors: messages });
        return true;
    }
    if (error instanceof mongoose.Error.CastError) {
        res.status(400).send({ message: `Invalid value for ${error.path}` });
        return true;
    }
    return false;
}

// Rejects ids that aren't valid MongoDB ObjectIds before they reach the database
function hasValidNoteId(req, res) {
    if (!mongoose.isValidObjectId(req.params.noteId)) {
        res.status(400).send({ message: `Invalid note id ${req.params.noteId}` });
        return false;
    }
    return true;
}

// Create a new Note
// https://mongoosejs.com/docs/api/document.html#Document.prototype.save()
noteRoutes.post('/notes', async (req, res, next) => {
    // Validate request
    if (!hasNoteContent(req)) {
        return res.status(400).send({
            message: "Note content can not be empty"
        });
    }
    try {
        const newNote = new noteModel(pickNoteFields(req.body.content));
        const savedNote = await newNote.save();
        res.status(201).send(savedNote);
    } catch (error) {
        if (!sendClientError(error, res)) next(error);
    }
});

// Retrieve all Notes (newest first)
// https://mongoosejs.com/docs/api/model.html#Model.find()
noteRoutes.get('/notes', async (req, res, next) => {
    try {
        const allNotes = await noteModel.find().sort({ dateAdded: -1 });
        res.send(allNotes);
    } catch (error) {
        next(error);
    }
});

// Retrieve a single Note with noteId
// https://mongoosejs.com/docs/api/model.html#Model.findById()
noteRoutes.get('/notes/:noteId', async (req, res, next) => {
    if (!hasValidNoteId(req, res)) return;
    try {
        const foundNote = await noteModel.findById(req.params.noteId);
        if (!foundNote) {
            return res.status(404).send({ message: `Note not found with id ${req.params.noteId}` });
        }
        res.send(foundNote);
    } catch (error) {
        next(error);
    }
});

// Update a Note with noteId
// https://mongoosejs.com/docs/api/model.html#Model.findByIdAndUpdate()
noteRoutes.put('/notes/:noteId', async (req, res, next) => {
    // Validate request
    if (!hasNoteContent(req)) {
        return res.status(400).send({
            message: "Note content can not be empty"
        });
    }
    if (!hasValidNoteId(req, res)) return;
    try {
        const updatedFields = pickNoteFields(req.body.content);
        // dateAdded never changes on an update; dateUpdated is "now" unless the client sends one
        delete updatedFields.dateAdded;
        updatedFields.dateUpdated = updatedFields.dateUpdated || Date.now();

        const updatedNote = await noteModel.findByIdAndUpdate(
            req.params.noteId,
            updatedFields,
            { new: true, runValidators: true } // return the updated note, and check enum/required rules
        );
        if (!updatedNote) {
            return res.status(404).send({ message: `Note not found with id ${req.params.noteId}` });
        }
        res.send(updatedNote);
    } catch (error) {
        if (!sendClientError(error, res)) next(error);
    }
});

// Delete a Note with noteId
// findByIdAndRemove was removed in Mongoose 8, so this uses findByIdAndDelete
// https://mongoosejs.com/docs/api/model.html#Model.findByIdAndDelete()
noteRoutes.delete('/notes/:noteId', async (req, res, next) => {
    if (!hasValidNoteId(req, res)) return;
    try {
        const deletedNote = await noteModel.findByIdAndDelete(req.params.noteId);
        if (!deletedNote) {
            return res.status(404).send({ message: `Note not found with id ${req.params.noteId}` });
        }
        res.send({ message: 'Note deleted successfully', note: deletedNote });
    } catch (error) {
        next(error);
    }
});

module.exports = noteRoutes;
