const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const rooms = {};

// 1️⃣ إنشاء غرفة أو تسجيل حركة
app.get('/make_move.php', (req, res) => {
    const { action, room, board, pos, player } = req.query;

    if (action === 'create') {
        rooms[room] = "INIT";
        return res.send("CREATED");
    }

    if (room && board !== undefined && pos !== undefined && player !== undefined) {
        rooms[room] = `${board},${pos},${player}`;
        return res.send("OK");
    }

    res.send("ERROR");
});

// 2️⃣ الاستعلام عن حركة الخصم
app.get('/get_move.php', (req, res) => {
    const { room } = req.query;
    if (rooms[room]) {
        return res.send(rooms[room]);
    }
    res.send("ERROR");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
