// Create web server using express

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');

// Create express app
const app = express();

// Use body parser to parse json
app.use(bodyParser.json());

// Use cors
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Create route to get comments
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

// Create route to post comments
app.post('/posts/:id/comments', async (req, res) => {
    // Generate random id for comment
    const commentId = randomBytes(4).toString('hex');

    // Get comment and post id
    const { content } = req.body;

    // Get comments for a post
    const comments = commentsByPostId[req.params.id] || [];

    // Add new comment to comments
    comments.push({ id: commentId, content, status: 'pending' });

    // Update comments
    commentsByPostId[req.params.id] = comments;

    // Emit event for comment created
    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            postId: req.params.id,
            id: commentId,
            content,
            status: 'pending'
        }
    });

    // Send response
    res.status(201).send(comments);
});

// Create route to handle events
app.post('/events', async (req, res) => {
    // Get event
    const { type, data } = req.body;

    // Check if event is comment moderated
    if (type === 'CommentModerated') {
        // Get comment and post id
        const { postId, id, status, content } = data;

        // Get comments for a post
        const comments = commentsByPostId[postId];

        // Find comment
        const comment = comments.find(comment => comment.id === id);

        // Update comment status
        comment.status = status;

        // Emit event for comment updated
        await axios.post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: {
                postId,
                id