<?php
// hostinger_upload.php
// ESTE ARCHIVO VA EN TU HOSTINGER (ej. en la carpeta public_html/api/)

// 1. CABECERAS CORS (Fundamentales para que Vercel pueda hablar con Hostinger)
$allowed_origins = [
    'http://localhost:5173', // Para cuando pruebes en local
    'https://tu-proyecto.vercel.app', // ¡CAMBIA ESTO por tu URL de Vercel real!
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $origin);
}

header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// 2. Manejar la pre-solicitud (Preflight OPTIONS de CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 3. Clave de seguridad (la misma que pones en tu .env de Vercel como VITE_HOSTINGER_API_KEY)
$api_key_secreta = "familia-galletas-123";

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["error" => "Método no permitido"]);
    http_response_code(405);
    exit();
}

// Validar API Key
$api_key_recibida = isset($_POST['api_key']) ? $_POST['api_key'] : '';
if ($api_key_recibida !== $api_key_secreta) {
    echo json_encode(["error" => "No autorizado. API Key incorrecta."]);
    http_response_code(401);
    exit();
}

// 4. Procesamiento del Archivo
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(["error" => "No se subió ningún archivo o hubo un error."]);
    http_response_code(400);
    exit();
}

$file = $_FILES['file'];

// Carpeta donde se guardarán (asegúrate de crear esta carpeta en Hostinger y darle permisos 755)
$upload_dir = 'uploads/'; 
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// Generar nombre seguro y único
$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$nombre_seguro = uniqid('recuerdo_') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
$ruta_destino = $upload_dir . $nombre_seguro;

if (move_uploaded_file($file['tmp_name'], $ruta_destino)) {
    // Generar la URL final para devolver al frontend
    $protocolo = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https://" : "http://";
    $dominio = $_SERVER['HTTP_HOST'];
    $ruta_base = dirname($_SERVER['REQUEST_URI']);
    
    // Si el script está en /api/hostinger_upload.php, ruta_base será /api
    $url_final = $protocolo . $dominio . $ruta_base . '/' . $ruta_destino;
    
    echo json_encode([
        "success" => true,
        "file_url" => $url_final,
        "message" => "Archivo subido correctamente a Hostinger"
    ]);
} else {
    echo json_encode(["error" => "Fallo al mover el archivo al destino final."]);
    http_response_code(500);
}
?>
