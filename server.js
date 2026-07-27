const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ذاكرة لتخزين تحركات وغرف اللعبة
const rooms = {};

// معالجة رابط إنشاء الغرف والحركات والشات
app.get('/make_move.php', (req, res) => {
    const { action, room, board, pos, player, move } = req.query;

    if (!room) {
        return res.send('ERROR_NO_ROOM');
    }

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

// معالجة رابط استلام التحركات
app.get('/get_move.php', (req, res) => {
    const { room } = req.query;

    if (!room || !rooms[room]) {
        return res.send('ERROR_ROOM_NOT_FOUND');
    }

    res.send(rooms[room].lastMove);
});

// الصفحة الرئيسية لتأكيد عمل السيرفر
app.get('/', (req, res) => {
    res.send('Server is running successfully');
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
 
