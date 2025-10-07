<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// POSTのみ許可
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// リクエストボディ取得
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['prompt']) || empty(trim($data['prompt']))) {
    http_response_code(400);
    echo json_encode(['error' => 'プロンプトが空です']);
    exit;
}

$prompt = trim($data['prompt']);

// APIキーは環境変数または別ファイルで管理
// 例: config.php に定義
require_once __DIR__ . '/config.php';

if (!defined('OPENAI_API_KEY') || empty(OPENAI_API_KEY)) {
    http_response_code(500);
    echo json_encode(['error' => 'API設定エラー']);
    exit;
}

// OpenAI APIリクエスト
$apiUrl = 'https://api.openai.com/v1/chat/completions';
$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer ' . OPENAI_API_KEY
];

$payload = json_encode([
    'model' => 'gpt-4o-mini',
    'messages' => [
        ['role' => 'user', 'content' => $prompt]
    ],
    'max_tokens' => 500,
    'temperature' => 0.7
]);

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => '通信エラー: ' . $curlError]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo json_encode(['error' => 'OpenAI APIエラー', 'details' => $response]);
    exit;
}

$result = json_decode($response, true);

if (!isset($result['choices'][0]['message']['content'])) {
    http_response_code(500);
    echo json_encode(['error' => 'レスポンス形式エラー']);
    exit;
}

// 成功レスポンス
echo json_encode([
    'success' => true,
    'content' => $result['choices'][0]['message']['content']
]);