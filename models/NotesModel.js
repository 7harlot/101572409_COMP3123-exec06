const mongoose = require('mongoose');

// The only values allowed for a note's priority
const PRIORITY_LEVELS = ['HIGH', 'MEDIUM', 'LOW'];

// Note Schema with fields: noteTitle, noteDescription, priority, dateAdded, dateUpdated
const noteSchema = new mongoose.Schema({
    noteTitle: {
        type: String,
        required: [true, 'noteTitle is required'],
        trim: true,
        maxlength: [200, 'noteTitle can be at most 200 characters']
    },
    noteDescription: {
        type: String,
        trim: true,
        default: ''
    },
    priority: {
        type: String,
        uppercase: true, // "high" is stored as "HIGH" before the enum check runs
        enum: {
            values: PRIORITY_LEVELS,
            message: 'priority must be HIGH, MEDIUM or LOW'
        },
        default: 'MEDIUM'
    },
    // Dates can be sent by the client (e.g. "06/Oct/2025"); if not, they default to now
    dateAdded: {
        type: Date,
        default: Date.now
    },
    dateUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Note', noteSchema);
module.exports.PRIORITY_LEVELS = PRIORITY_LEVELS;
