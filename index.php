<?php
$get = $_GET['get'];
$url = 'https://jiotvapi.cdn.jio.com/apis/v3.0/getMobileChannelList/get/?langid=6&devicetype=phone&os=android&usertype=JIO&version=34';

$heads = [
  'http' => [
      'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36\r\n",
      'follow_location' => 1,
      'timeout' => 5
  ]
];
$context = stream_context_create($heads);
$res = file_get_contents($url, false, $context);
echo $res;
?>
