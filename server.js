const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// تخزين بيانات الغرف في الذاكرة
const rooms = {};

app.get('/make_move.php', (req, res) => {
    const room = req.query.room;
    const action = req.query.action;
    const move = req.query.move;
    const board = req.query.board;
    const pos = req.query.pos;
    const player = req.query.player;

    if (!room) return res.send("ERROR: NO_ROOM");

    if (action === 'create') {
        rooms[room] = "INIT";
        return res.send("CREATED");
    }

    if (board !== undefined && pos !== undefined && player !== undefined) {
        rooms[room] = `${board},${pos},${player}`;
        return res.send("OK");
    }

    if (move) {
        rooms[room] = move;
        return res.send("OK");
    }

    res.send("ERROR: INVALID_REQUEST");
});

app.get('/get_move.php', (req, res) => {
    const room = req.query.room;
    if (!room) return res.send("ERROR: NO_ROOM");
    
    if (!rooms[room]) {
        return res.send("ERROR: ROOM_NOT_FOUND");
    }

    res.send(rooms[room]);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
