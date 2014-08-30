<?php
if(empty($_POST['filename']) || empty($_POST['content'])){
    exit;
}

// Sanitizing the filename:
$filename = preg_replace('/[^a-z0-9\-\_\.]/i','',$_POST['filename']);

// Outputting headers:
header("Cache-Control: ");
header("Content-type: image/svg+xml");
header('Content-Disposition: attachment; filename="'.$filename.'"');

echo '<?xml version="1.0" encoding="UTF-8"?>'."\n".$_POST['content'];
?>