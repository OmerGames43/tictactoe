const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ذاكرة مؤقتة لتخزين حركة كل غرفة
const rooms = {};

// معالجة طلبات إنشاء الغرفة أو إرسال حركة أو شات
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
        // إرسال النص أو الإيموجي
        rooms[room].lastMove = move;
    } else if (board !== undefined && pos !== undefined && player !== undefined) {
        // إرسال حركة اللاعب
        rooms[room].lastMove = `${board},${pos},${player}`;
    }

    res.send('OK');
});

// معالجة طلب جلب أحدث حركة في الغرفة
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
