const express = require('express');
const bodyParser = require('body-parser');
const Datastore = require('nedb');
const path = require('path');

const app = express();
const PORT = 3000;

// Базы данных создадутся автоматически в виде файлов в корне проекта
const db = {};
db.users = new Datastore({ filename: 'users.db', autoload: true });
db.tickets = new Datastore({ filename: 'tickets.db', autoload: true });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Регистрация игрока
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    db.users.findOne({ username: username.toLowerCase() }, (err, user) => {
        if (user) return res.send('Этот ник уже зарегистрирован на форуме!');
        db.users.insert({ username: username.toLowerCase(), displayName: username, password, role: 'player' }, (err, newUser) => {
            res.redirect('/index.html?reg=success');
        });
    });
});

// Авторизация (Вход)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.users.findOne({ username: username.toLowerCase(), password: password }, (err, user) => {
        if (!user) return res.send('Неверный ник или пароль! Попробуйте снова.');
        if (user.role === 'admin') {
            res.redirect(`/admin.html?user=${user.displayName}`);
        } else {
            res.redirect(`/dashboard.html?user=${user.displayName}`);
        }
    });
});

// Создание нового тикета игроком
app.post('/api/tickets', (req, res) => {
    const { username, text } = req.body;
    const newTicket = {
        username,
        text,
        reply: 'Ожидает ответа администрации...',
        status: 'open',
        date: new Date().toLocaleString()
    };
    db.tickets.insert(newTicket, (err, doc) => {
        res.redirect(`/dashboard.html?user=${username}`);
    });
});

// Получить тикеты конкретного игрока
app.get('/api/tickets/:username', (req, res) => {
    db.tickets.find({ username: req.params.username }, (err, docs) => {
        res.json(docs);
    });
});

// Получить все тикеты (только для панели Админа)
app.get('/api/admin/tickets', (req, res) => {
    db.tickets.find({}, (err, docs) => {
        res.json(docs);
    });
});

// Ответ админа на тикет
app.post('/api/tickets/reply', (req, res) => {
    const { ticketId, replyText, adminName } = req.body;
    db.tickets.update({ _id: ticketId }, { $set: { reply: replyText, status: 'resolved' } }, {}, (err, numReplaced) => {
        res.redirect(`/admin.html?user=${adminName}`);
    });
});

// Автоматическая настройка порта под удаленный хостинг (Render)
const serverPort = process.env.PORT || PORT;
app.listen(serverPort, '0.0.0.0', () => {
    console.log(`Сервер успешно запущен на порту: ${serverPort}`);
});
