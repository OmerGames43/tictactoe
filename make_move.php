<?php
header('Content-Type: text/plain; charset=utf-8');

$room = isset($_GET['room']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['room']) : '';
$action = isset($_GET['action']) ? $_GET['action'] : '';
$move = isset($_GET['move']) ? $_GET['move'] : '';

// إذا تم تحديد الخانات بالتفصيل (board, pos, player)
if (isset($_GET['board']) && isset($_GET['pos']) && isset($_GET['player'])) {
    $board = $_GET['board'];
    $pos = $_GET['pos'];
    $player = $_GET['player'];
    $move = "{$board},{$pos},{$player}";
}

if (empty($room)) {
    echo "ERROR: NO_ROOM";
    exit;
}

$file = __DIR__ . "/room_" . $room . ".txt";

// 1. إجراء إنشاء الغرفة
if ($action === 'create') {
    file_put_contents($file, "INIT");
    echo "CREATED";
    exit;
}

// 2. إجراء إرسال الحركة أو الإيموجي/الدردشة
if (!empty($move)) {
    file_put_contents($file, $move);
    echo "OK";
    exit;
}

echo "ERROR: INVALID_REQUEST";
?>
