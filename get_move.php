<?php
header('Content-Type: text/plain; charset=utf-8');

$room = isset($_GET['room']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['room']) : '';

if (empty($room)) {
    echo "ERROR: NO_ROOM";
    exit;
}

$file = __DIR__ . "/room_" . $room . ".txt";

if (!file_exists($file)) {
    echo "ERROR: ROOM_NOT_FOUND";
    exit;
}

// قراءة آخر حركة مخزنة في الغرفة
$lastMove = trim(file_get_contents($file));

if (empty($lastMove)) {
    echo "INIT";
} else {
    echo $lastMove;
}
?>
