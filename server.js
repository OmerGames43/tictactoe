const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const rooms = {};

app.get('/', (req, res) => {
    res.send('Tic Tac Toe Server is running');
});

app.get('/make_move.php', (req, res) => {
    const { action, room, board, pos, player, move } = req.query;

    if (!room) return res.send('ERROR_NO_ROOM');

    if (action === 'create') {
        rooms[room] = { lastMove: 'INIT' };
        return res.send('CREATED');
    }

    if (!rooms[room]) {
        rooms[room] = { lastMove: 'INIT' };
    }

    if (move) {
        rooms[room].lastMove = move;
    } else if (board !== undefined && pos !== undefined && player !== undefined) {
        rooms[room].lastMove = `${board},${pos},${player}`;
    }

    res.send('OK');
});

app.get('/get_move.php', (req, res) => {
    const { room } = req.query;

    if (!room || !rooms[room]) {
        return res.send('ERROR_ROOM_NOT_FOUND');
    }

    res.send(rooms[room].lastMove);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
