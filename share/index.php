<?php
/**
 * MORPHOSPACE SHARE API — XServer, same-origin OG thumbnail storage.
 * No external library, credentials, or writable path in the public document root.
 * PHP 7.4+.
 */
declare(strict_types=1);

const MS_HOST = 'https://morphospace.masalakitchen.jp';
const MS_UPLOAD_LIMIT = 200000;
const MS_PENDING_SECONDS = 900;

function ms_json(int $status, array $data): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function ms_error(int $status, string $message): void {
    ms_json($status, ['error' => $message]);
}
function ms_store(bool $create = false): string {
    // For the documented XServer document root, four parents reaches /home/<user>.
    // An environment override is available for testing or alternate installations.
    $root = getenv('MORPHOSPACE_SHARE_STORAGE') ?: dirname(__DIR__, 4) . '/morphospace-share-data';
    if ($create) {
        foreach ([$root, $root.'/pending', $root.'/images', $root.'/records', $root.'/rates'] as $dir) {
            if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
                ms_error(503, '共有画像保存領域を作成できません。サーバー設定を確認してください。');
            }
        }
    }
    // Do not put private DNA/share records in public_html.
    $document = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? ''));
    $realRoot = realpath($root);
    if ($document !== false && $realRoot !== false &&
        ($realRoot === $document || strpos($realRoot, $document . DIRECTORY_SEPARATOR) === 0)) {
        ms_error(503, '共有画像保存領域を公開ディレクトリの外に配置してください。');
    }
    return $root;
}
function ms_body(int $limit): string {
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > $limit) ms_error(413, '共有データが大きすぎます。');
    $input = file_get_contents('php://input', false, null, 0, $limit + 1);
    if ($input === false || strlen($input) > $limit) ms_error(413, '共有データが大きすぎます。');
    return $input;
}
function ms_post_guard(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') ms_error(405, 'POST が必要です。');
    if (($_SERVER['HTTP_X_MORPHOSPACE_SHARE'] ?? '') !== '1') ms_error(403, '共有アップロードヘッダーが必要です。');
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin !== '') {
        $from = strtolower((string)(parse_url($origin, PHP_URL_HOST) ?: ''));
        $host = strtolower(explode(':', (string)($_SERVER['HTTP_HOST'] ?? ''))[0]);
        if ($from === '' || $from !== $host) ms_error(403, '異なるサイトからの共有は受け付けません。');
    }
}
function ms_rate(string $root): void {
    $remote = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $name = hash('sha256', $remote);
    $file = $root.'/rates/'.$name.'.json';
    $handle = @fopen($file, 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) ms_error(503, 'アップロード制限を確認できません。');
    $raw = stream_get_contents($handle);
    $prior = json_decode($raw ?: '[]', true);
    $now = time();
    $timestamps = is_array($prior) ? array_values(array_filter($prior, function($t) use ($now) {
        return is_int($t) && $t > $now - 86400 && $t <= $now + 60;
    })) : [];
    $hour = count(array_filter($timestamps, function($t) use ($now) { return $t > $now - 3600; }));
    if ($hour >= 30 || count($timestamps) >= 100) {
        flock($handle, LOCK_UN);
        fclose($handle);
        ms_error(429, '共有画像の登録回数が上限に達しました。時間をおいてください。');
    }
    $timestamps[] = $now;
    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, json_encode($timestamps));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
}
function ms_id(string $id): bool {
    return preg_match('/^[0-9a-f]{32}$/D', $id) === 1;
}
function ms_ticket(): void {
    ms_post_guard();
    $raw = ms_body(48000);
    $input = json_decode($raw, true);
    if (!is_array($input)) ms_error(400, '共有情報の形式が違います。');
    $dna = (string)($input['d'] ?? '');
    $hash = (string)($input['imageHash'] ?? '');
    $title = trim(strip_tags((string)($input['title'] ?? 'MORPHOSPACE')));
    $description = trim(strip_tags((string)($input['description'] ?? '味と香りのクオリアに潜む生物たち。')));
    if (!preg_match('/^[A-Za-z0-9_-]{1,33000}$/D', $dna) ||
        !preg_match('/^[0-9a-f]{64}$/D', $hash)) ms_error(400, '共有DNAまたは画像ハッシュが不正です。');
    $decoded = base64_decode(strtr($dna, '-_', '+/') . str_repeat('=', (4 - strlen($dna)%4)%4), true);
    if ($decoded === false || strlen($decoded) < 8 || strlen($decoded) > 24004 ||
        substr($decoded, 0, 3) !== "MQ\x01") ms_error(400, '共有DNAが不正です。');
    if ($title === '' || strlen($title) > 240 || strlen($description) > 1200) ms_error(400, '共有画像の説明が不正です。');
    $root = ms_store(true);
    ms_rate($root);
    $id = bin2hex(random_bytes(16));
    $ticket = bin2hex(random_bytes(16));
    $pending = ['id'=>$id, 'd'=>$dna, 'hash'=>$hash, 'title'=>$title,
        'description'=>$description, 'time'=>time()];
    $ticketPath = $root.'/pending/'.$ticket.'.json';
    if (@file_put_contents($ticketPath, json_encode($pending, JSON_UNESCAPED_UNICODE), LOCK_EX) === false) {
        ms_error(503, '共有チケットを保存できません。');
    }
    // Old unused tickets expire. Published images are never cleared automatically.
    if (random_int(0, 23) === 0) {
        foreach (glob($root.'/pending/*.json') ?: [] as $file) {
            if (@filemtime($file) < time() - MS_PENDING_SECONDS * 2) @unlink($file);
        }
    }
    ms_json(200, ['ticket'=>$ticket,'url'=>MS_HOST.'/share/index.php?id='.$id]);
}
function ms_upload(): void {
    ms_post_guard();
    $ticket = (string)($_SERVER['HTTP_X_SHARE_TICKET'] ?? '');
    $proof = (string)($_SERVER['HTTP_X_SHARE_PROOF'] ?? '');
    if (!ms_id($ticket) || !preg_match('/^[0-9]{1,8}$/D', $proof) ||
        substr(hash('sha256', $ticket.':'.$proof), 0, 4) !== '0000') {
        ms_error(403, '共有画像の登録証明が無効です。');
    }
    $root = ms_store(true);
    $ticketPath = $root.'/pending/'.$ticket.'.json';
    $fh = @fopen($ticketPath, 'r+');
    if (!$fh || !flock($fh, LOCK_EX)) ms_error(404, '共有チケットがありません。');
    $entry = json_decode(stream_get_contents($fh) ?: '', true);
    if (!is_array($entry) || time() - (int)($entry['time'] ?? 0) > MS_PENDING_SECONDS ||
        !ms_id((string)($entry['id'] ?? ''))) {
        flock($fh, LOCK_UN); fclose($fh); @unlink($ticketPath);
        ms_error(410, '共有チケットの有効期限が切れました。');
    }
    $jpg = ms_body(MS_UPLOAD_LIMIT);
    if (strlen($jpg) < 200 || !hash_equals((string)$entry['hash'], hash('sha256', $jpg))) {
        flock($fh, LOCK_UN); fclose($fh);
        ms_error(400, '共有画像の検証に失敗しました。');
    }
    $imageInfo = @getimagesizefromstring($jpg);
    if (!is_array($imageInfo) || ($imageInfo['mime'] ?? '') !== 'image/jpeg' ||
        $imageInfo[0] < 1 || $imageInfo[1] < 1 || $imageInfo[0] > 2048 || $imageInfo[1] > 2048) {
        flock($fh, LOCK_UN); fclose($fh);
        ms_error(400, 'JPEG画像のみ登録できます。');
    }
    $imagePath = $root.'/images/'.$entry['id'].'.jpg';
    $recordPath = $root.'/records/'.$entry['id'].'.json';
    if (count(glob($root.'/images/*.jpg') ?: []) >= 5000) {
        flock($fh, LOCK_UN); fclose($fh);
        ms_error(507, '共有画像保存容量の管理上限に達しました。');
    }
    $record = ['id'=>$entry['id'], 'd'=>$entry['d'], 'title'=>$entry['title'],
        'description'=>$entry['description'], 'width'=>$imageInfo[0], 'height'=>$imageInfo[1],
        'createdAt'=>gmdate('c')];
    $tmpImg = $imagePath.'.tmp-'.$ticket;
    $tmpMeta = $recordPath.'.tmp-'.$ticket;
    if (@file_put_contents($tmpImg, $jpg, LOCK_EX) !== strlen($jpg) ||
        @file_put_contents($tmpMeta, json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX) === false ||
        !@rename($tmpImg, $imagePath) || !@rename($tmpMeta, $recordPath)) {
        @unlink($tmpImg); @unlink($tmpMeta); @unlink($imagePath);
        flock($fh, LOCK_UN); fclose($fh);
        ms_error(503, 'サムネイルを本サーバーに保存できません。');
    }
    @unlink($ticketPath);
    flock($fh, LOCK_UN); fclose($fh);
    ms_json(200, ['url'=>MS_HOST.'/share/index.php?id='.$entry['id'], 'image'=>MS_HOST.'/share/index.php?image='.$entry['id']]);
}
function ms_image(string $id): void {
    if (!ms_id($id)) { http_response_code(404); exit; }
    $root = ms_store(false);
    $file = $root.'/images/'.$id.'.jpg';
    if (!is_file($file)) { http_response_code(404); exit; }
    header('Content-Type: image/jpeg');
    header('Content-Length: '.filesize($file));
    header('Cache-Control: public, max-age=31536000, immutable');
    header('X-Content-Type-Options: nosniff');
    readfile($file);
    exit;
}
function ms_page(string $id): void {
    if (!ms_id($id)) { http_response_code(404); exit; }
    $root = ms_store(false);
    $file = $root.'/records/'.$id.'.json';
    if (!is_file($file) || !is_file($root.'/images/'.$id.'.jpg')) { http_response_code(404); exit; }
    $record = json_decode(file_get_contents($file) ?: '', true);
    if (!is_array($record) || !isset($record['d']) ||
        !preg_match('/^[A-Za-z0-9_-]{1,33000}$/D', (string)$record['d'])) {
        http_response_code(404); exit;
    }
    $escape = function($s) { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); };
    $url = MS_HOST.'/share/index.php?id='.$id;
    $image = MS_HOST.'/share/index.php?image='.$id;
    $destination = MS_HOST.'/#q='.$record['d'];
    $title = 'MORPHOSPACE — '.$record['title'];
    $description = $record['description'];
    $nonce = base64_encode(random_bytes(18));
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=300');
    header('Referrer-Policy: no-referrer');
    header("Content-Security-Policy: default-src 'none'; img-src 'self'; script-src 'nonce-".$nonce."'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
    echo '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>'.$escape($title).'</title><meta name="description" content="'.$escape($description).'">';
    echo '<meta property="og:type" content="website"><meta property="og:site_name" content="MORPHOSPACE">';
    echo '<meta property="og:title" content="'.$escape($title).'"><meta property="og:description" content="'.$escape($description).'">';
    echo '<meta property="og:url" content="'.$escape($url).'"><meta property="og:image" content="'.$escape($image).'">';
    echo '<meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="'.$escape($record['width'] ?? 1080).'">';
    echo '<meta property="og:image:height" content="'.$escape($record['height'] ?? 1080).'">';
    echo '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="'.$escape($image).'">';
    echo '<link rel="canonical" href="'.$escape($url).'"></head><body style="background:#071721;color:#e4eadc;font:16px sans-serif;text-align:center;padding:15vh 20px">';
    echo '<h1>MORPHOSPACE</h1><p>'.$escape($record['title']).'</p><p><a style="color:#b9e6d6" href="'.$escape($destination).'">生体を3Dで鑑賞する</a></p>';
    echo '<script nonce="'.$escape($nonce).'">location.replace('.json_encode($destination, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT).');</script>';
    echo '</body></html>';
    exit;
}

$api = (string)($_GET['api'] ?? '');
if ($api === 'health') {
    $root = ms_store(false);
    ms_json(200, ['service'=>'morphospace-share', 'version'=>1,
        'ready'=>is_dir($root) ? is_writable($root) : is_writable(dirname($root))]);
}
if ($api === 'ticket') ms_ticket();
if ($api === 'upload') ms_upload();
if (isset($_GET['image'])) ms_image((string)$_GET['image']);
if (isset($_GET['id'])) ms_page((string)$_GET['id']);
http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'Not found';
