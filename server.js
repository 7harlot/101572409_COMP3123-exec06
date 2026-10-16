// Loads DB_URL (and optionally PORT) from a .env file so the Atlas password never goes into the code
require('dotenv').config({ quiet: true });

const express = require('express');
const mongoose = require('mongoose');
const noteRoutes = require('./routes/NoteRoutes.js');

// MongoDB Atlas URL comes from the .env file (copy .env.example to .env and fill it in)
const DB_URL = process.env.DB_URL || "";
const PORT = process.env.PORT || 8081;

const app = express();

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
    res.send("<h1>Welcome to Note taking application - Week06 Exercise</h1>");
});

// Note API: /notes and /notes/:noteId
app.use('/', noteRoutes);

// Any route not matched above gets a 404
app.use((req, res) => {
    res.status(404).send({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Error handler (4 arguments): malformed JSON is a 400, anything else is a 500
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).send({ message: 'Request body is not valid JSON' });
    }
    console.error(err);
    res.status(500).send({ message: 'Server Error' });
});

// Connect to the database first, then start listening
function startServer() {
    if (!DB_URL) {
        console.error('DB_URL is not set. Copy .env.example to .env and paste your MongoDB Atlas connection string into it.');
        process.exit(1);
    }

    // useNewUrlParser / useUnifiedTopology are removed: they do nothing since Mongoose 6 and only cause warnings
    mongoose.connect(DB_URL).then(() => {
        console.log("Successfully connected to the database mongoDB Atlas Server");
        app.listen(PORT, () => {
            console.log(`Server is listening on port ${PORT}`);
        });
    }).catch(err => {
        console.log('Could not connect to the database. Exiting now...', err);
        process.exit(1);
    });
}

// Only start the server when run directly (node server.js), not when required by a test
if (require.main === module) {
    startServer();
}

module.exports = app;
