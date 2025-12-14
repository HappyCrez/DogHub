from flask import Flask, send_file, abort, render_template_string, make_response, request
from werkzeug.utils import safe_join
import os
import socket

app = Flask(__name__)

# Базовая директория с изображениями
IMAGE_BASE_DIR = "/home/lexcivis/Pictures/DogHub"

# Разрешенные расширения файлов
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}

def get_local_ip():
    """Получает локальный IP адрес"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "Unknown"

@app.route('/')
def index():
    """Главная страница с информацией"""
    hostname = socket.gethostname()
    local_ip = get_local_ip()

    # Берём хост так, как его видит клиент (учитываем прокси)
    host = request.headers.get('X-Forwarded-Host', request.host)
    # Отбрасываем порт, если он есть
    server_name = host.split(':')[0]

    # Базовый URL без порта, вроде http://192.168.0.30 или http://images.mysite.com
    base_url = f"{request.scheme}://{server_name}"

    # Получаем список файлов (включая подпапки)
    files = []
    try:
        for root, dirs, filenames in os.walk(IMAGE_BASE_DIR):
            for filename in filenames:
                file_path = os.path.join(root, filename)

                # Проверяем расширение
                _, ext = os.path.splitext(filename)
                if ext.lower() not in ALLOWED_EXTENSIONS:
                    continue

                # Получаем путь относительно базовой директории
                rel_root = os.path.relpath(root, IMAGE_BASE_DIR)
                if rel_root == '.':
                    rel_path = filename
                else:
                    rel_path = os.path.join(rel_root, filename)

                files.append(rel_path)

        files.sort()
    except Exception as e:
        files = [f"Error: {e}"]

    return render_template_string('''
    <!doctype html>
    <html lang="ru">
    <head>
        <meta charset="utf-8">
        <title>DogHub Image Server</title>
        <style>
            * { box-sizing: border-box; }
            body {
                margin: 0;
                padding: 40px 16px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
                background: #FFF7E6; /* мягкий светло-жёлтый фон */
                color: #111827;
            }
            .page {
                max-width: 1100px;
                margin: 0 auto;
            }
            .hero-card {
                background: linear-gradient(90deg, #FFE9B3, #FFE3C4);
                border-radius: 24px;
                padding: 24px 28px;
                box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
            }
            .hero-title {
                margin: 0 0 6px;
                font-size: 28px;
                font-weight: 800;
            }
            .hero-subtitle {
                margin: 0 0 16px;
                font-size: 15px;
                color: #4B5563;
            }
            .hero-usage-label {
                font-weight: 600;
                margin-right: 8px;
            }
            .hero-usage {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-items: center;
                font-size: 14px;
            }
            .pill {
                display: inline-flex;
                align-items: center;
                padding: 4px 10px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.8);
                border: 1px solid rgba(209, 213, 219, 0.7);
                font-size: 13px;
                color: #374151;
            }
            .pill code {
                background: transparent;
                padding: 0;
                font-size: 13px;
            }
            .hero-footer {
                margin-top: 14px;
                font-size: 13px;
                color: #6B7280;
            }
            .section {
                margin-top: 24px;
            }
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                margin-bottom: 10px;
            }
            .section-title {
                font-size: 18px;
                font-weight: 700;
            }
            .section-count {
                font-size: 13px;
                color: #6B7280;
            }
            .gallery {
                background: #FFFDF7;
                border-radius: 18px;
                border: 1px solid #F3E3C5;
                padding: 10px 6px;
                max-height: 65vh;
                overflow: auto;
            }
            .img-list {
                list-style: none;
                margin: 0;
                padding: 0;
            }
            .img-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 6px 10px;
                border-radius: 12px;
                transition: background 0.15s ease, transform 0.08s ease;
            }
            .img-item:hover {
                background: rgba(0, 0, 0, 0.03);
                transform: translateY(-1px);
            }
            .thumb-wrap {
                flex: 0 0 auto;
                width: 64px;
                height: 64px;
                border-radius: 16px;
                overflow: hidden;
                background: #F3F4F6;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .thumb-wrap img {
                max-width: 100%;
                max-height: 100%;
                display: block;
            }
            .img-meta {
                flex: 1 1 auto;
                min-width: 0;
            }
            .img-name {
                font-size: 14px;
                font-weight: 500;
                color: #111827;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .img-url {
                margin-top: 2px;
                font-size: 12px;
                color: #6B7280;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .img-url code {
                background: transparent;
                padding: 0;
                font-size: 12px;
            }
            .actions {
                flex: 0 0 auto;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            button.copy {
                border: none;
                border-radius: 999px;
                padding: 6px 10px;
                font-size: 12px;
                cursor: pointer;
                background: #111827;
                color: #F9FAFB;
                font-weight: 500;
                box-shadow: 0 10px 20px rgba(15, 23, 42, 0.25);
                transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.15s ease;
            }
            button.copy:hover {
                background: #020617;
                transform: translateY(-1px);
                box-shadow: 0 14px 28px rgba(15, 23, 42, 0.28);
            }
            button.copy:active {
                transform: translateY(0);
                box-shadow: 0 8px 16px rgba(15, 23, 42, 0.22);
            }
            code {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 0.9em;
                background: #F3F4F6;
                padding: 2px 4px;
                border-radius: 4px;
            }
            a {
                color: inherit;
                text-decoration: none;
            }
        </style>
        <script>
            function copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(
                    () => {},
                    () => { alert("Не удалось скопировать :("); }
                );
            }
        </script>
    </head>
    <body>
        <div class="page">
            <div class="hero-card">
                <h1 class="hero-title">DogHub — сервер изображений</h1>
                <p class="hero-subtitle">
                    Загружайте фото собак в папку <code>{{ image_dir }}</code>, а здесь копируйте ссылки для сайта.
                </p>
                <div class="hero-usage">
                    <span class="hero-usage-label">Примеры ссылок:</span>
                    <span class="pill"><code>{{ base_url }}/filename.jpg</code></span>
                    <span class="pill"><code>{{ base_url }}/subfolder/filename.jpg</code></span>
                </div>
                <p class="hero-footer">
                    Изображения автоматически подхватываются из корневой папки и всех подпапок.
                </p>
            </div>

            <div class="section">
                <div class="section-header">
                    <div class="section-title">Изображения</div>
                    <div class="section-count">{{ files_count }} шт.</div>
                </div>
                <div class="gallery">
                    <ul class="img-list">
                        {% for file in files %}
                        <li class="img-item">
                            <a href="/{{ file }}" target="_blank" class="thumb-wrap">
                                <img src="/{{ file }}" alt="{{ file }}">
                            </a>
                            <div class="img-meta">
                                <div class="img-name" title="{{ file }}">{{ file }}</div>
                                <div class="img-url" title="{{ base_url }}/{{ file }}">
                                    <code>{{ base_url }}/{{ file }}</code>
                                </div>
                            </div>
                            <div class="actions">
                                <button class="copy" onclick="copyToClipboard('{{ base_url }}/{{ file }}')">
                                    Копировать ссылку
                                </button>
                            </div>
                        </li>
                        {% endfor %}
                    </ul>
                </div>
            </div>
        </div>
    </body>
    </html>
    ''', hostname=hostname, local_ip=local_ip, image_dir=IMAGE_BASE_DIR,
                                  files=files, files_count=len(files),
                                  base_url=base_url)

@app.route('/<path:filename>')
def serve_image(filename):
    # Простая первичная проверка
    if '..' in filename or filename.startswith('/'):
        abort(403)

    # Безопасно склеиваем путь
    try:
        file_path = safe_join(IMAGE_BASE_DIR, filename)
    except Exception:
        abort(403)

    if not file_path or not os.path.isfile(file_path):
        abort(404)

    _, ext = os.path.splitext(file_path)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        abort(403)

    resp = make_response(send_file(file_path))
    # Жёсткий кэш: 1 год. Если картинку заменишь — лучше менять имя файла.
    resp.headers['Cache-Control'] = 'public, max-age=2592000'
    return resp

if __name__ == '__main__':
    hostname = socket.gethostname()
    local_ip = get_local_ip()

    print("=" * 60)
    print(f"🐕 DogHub Image Server Started!")
    print("=" * 60)
    print(f"Hostname: {hostname}")
    print(f"Local IP: {local_ip}")
    print(f"Port: 5000")
    print(f"Image directory: {IMAGE_BASE_DIR}")
    print("=" * 60)
    print("Access URLs:")
    print(f"Local: http://localhost:5000")
    print(f"Network: http://{local_ip}:5000")
    print("=" * 60)

    # Запускаем на всех интерфейсах
    app.run(host='0.0.0.0', port=5000, debug=False)