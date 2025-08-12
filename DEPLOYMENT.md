# 🚀 Руководство по деплою MarkMirror Mobile

Это руководство поможет вам развернуть MarkMirror Mobile на различных платформах статического хостинга.

## 📋 Требования

MarkMirror Mobile - это статическое веб-приложение, которое не требует серверной части. Для работы необходимо:

- Современный веб-браузер с поддержкой ES6 модулей
- HTTPS соединение (для некоторых функций, таких как импорт файлов)
- Веб-сервер для корректной работы ES6 модулей

## 🌐 GitHub Pages

### Автоматический деплой

1. **Форкните репозиторий** на GitHub или создайте новый репозиторий с кодом MarkMirror

2. **Включите GitHub Pages:**
   - Перейдите в Settings вашего репозитория
   - Найдите раздел "Pages" в левом меню
   - В разделе "Source" выберите "Deploy from a branch"
   - Выберите ветку `main` и папку `/ (root)`
   - Нажмите "Save"

3. **Дождитесь деплоя:**
   - GitHub автоматически соберет и опубликует ваше приложение
   - Процесс может занять несколько минут
   - Приложение будет доступно по адресу: `https://yourusername.github.io/repository-name/`

### Настройка кастомного домена (опционально)

1. **Добавьте CNAME файл** в корень репозитория:
   ```
   your-domain.com
   ```

2. **Настройте DNS записи** у вашего провайдера домена:
   ```
   Type: CNAME
   Name: www (или @)
   Value: yourusername.github.io
   ```

3. **Включите HTTPS** в настройках GitHub Pages

## 🎯 Netlify

### Деплой через Git

1. **Зарегистрируйтесь на [Netlify](https://netlify.com)**

2. **Создайте новый сайт:**
   - Нажмите "New site from Git"
   - Выберите GitHub/GitLab/Bitbucket
   - Авторизуйтесь и выберите репозиторий

3. **Настройте параметры сборки:**
   ```
   Build command: (оставьте пустым)
   Publish directory: /
   ```

4. **Деплой:**
   - Нажмите "Deploy site"
   - Netlify автоматически присвоит случайный URL
   - Вы можете изменить его в настройках

### Деплой через перетаскивание

1. **Скачайте или клонируйте репозиторий**

2. **Перейдите на [Netlify](https://netlify.com)**

3. **Перетащите папку проекта** в область "Deploy manually"

4. **Готово!** Ваше приложение будет развернуто мгновенно

### Настройка кастомного домена

1. **В панели Netlify** перейдите в "Domain settings"
2. **Добавьте кастомный домен**
3. **Настройте DNS** согласно инструкциям Netlify
4. **SSL сертификат** будет выпущен автоматически

## ⚡ Vercel

1. **Зарегистрируйтесь на [Vercel](https://vercel.com)**

2. **Импортируйте проект:**
   - Нажмите "New Project"
   - Импортируйте из Git репозитория
   - Выберите ваш репозиторий

3. **Настройки:**
   ```
   Framework Preset: Other
   Build Command: (оставьте пустым)
   Output Directory: ./
   Install Command: (оставьте пустым)
   ```

4. **Деплой:**
   - Нажмите "Deploy"
   - Vercel автоматически развернет приложение

## 🔥 Firebase Hosting

1. **Установите Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Инициализируйте проект:**
   ```bash
   firebase login
   firebase init hosting
   ```

3. **Настройте firebase.json:**
   ```json
   {
     "hosting": {
       "public": ".",
       "ignore": [
         "firebase.json",
         "**/.*",
         "**/node_modules/**"
       ],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ]
     }
   }
   ```

4. **Деплой:**
   ```bash
   firebase deploy
   ```

## 🌊 Surge.sh

1. **Установите Surge:**
   ```bash
   npm install -g surge
   ```

2. **Деплой:**
   ```bash
   cd /path/to/markmirror
   surge
   ```

3. **Следуйте инструкциям** для настройки домена

## 📦 Собственный сервер

### Nginx

1. **Скопируйте файлы** на сервер:
   ```bash
   scp -r * user@server:/var/www/markmirror/
   ```

2. **Настройте Nginx:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /var/www/markmirror;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Настройка MIME типов для ES6 модулей
       location ~* \.js$ {
           add_header Content-Type application/javascript;
       }
   }
   ```

3. **Перезапустите Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

### Apache

1. **Скопируйте файлы** в DocumentRoot

2. **Создайте .htaccess:**
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]

   # MIME типы для ES6 модулей
   AddType application/javascript .js
   ```

## 🔧 Настройка для продакшена

### Оптимизация производительности

1. **Включите сжатие** на веб-сервере:
   ```nginx
   gzip on;
   gzip_types text/css application/javascript text/javascript;
   ```

2. **Настройте кеширование:**
   ```nginx
   location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

### Безопасность

1. **Настройте HTTPS** (обязательно для PWA функций)

2. **Добавьте Security Headers:**
   ```nginx
   add_header X-Frame-Options "SAMEORIGIN";
   add_header X-Content-Type-Options "nosniff";
   add_header X-XSS-Protection "1; mode=block";
   ```

## 🐳 Docker (опционально)

Создайте `Dockerfile`:

```dockerfile
FROM nginx:alpine

COPY . /usr/share/nginx/html

# Настройка для SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

И `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.js$ {
        add_header Content-Type application/javascript;
    }
}
```

Сборка и запуск:

```bash
docker build -t markmirror .
docker run -p 8080:80 markmirror
```

## 🔍 Проверка деплоя

После деплоя проверьте:

1. **Приложение загружается** без ошибок
2. **ES6 модули работают** (проверьте консоль браузера)
3. **Все функции доступны:**
   - Редактирование текста
   - Превью обновляется
   - Настройки сохраняются
   - Импорт/экспорт файлов работает
4. **Мобильная версия** отображается корректно

## 🚨 Устранение проблем

### CORS ошибки
- Убедитесь, что приложение запущено через веб-сервер, а не открыто как файл
- Проверьте настройки CORS на сервере

### ES6 модули не загружаются
- Убедитесь, что сервер отдает .js файлы с правильным MIME типом
- Проверьте, что используется HTTPS (для некоторых браузеров)

### Функции не работают
- Откройте консоль разработчика и проверьте ошибки
- Убедитесь, что все внешние библиотеки загружаются

---

**Готово!** Ваше приложение MarkMirror Mobile успешно развернуто! 🎉
