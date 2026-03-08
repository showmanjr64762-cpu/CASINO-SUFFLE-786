const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let players = [
    {id: 1, username: 'Nolmar Pakistani', balance: 5000, totalWagered: 2000, isPlaying: false, banned: false},
    {id: 2, username: 'Player Two', balance: 3000, totalWagered: 1500, isPlaying: false, banned: false}
];

let transactions = [];
let winners = [];

app.get('/api/players', (req, res) => res.json(players));
app.get('/api/player/:id', (req, res) => {
    const player = players.find(p => p.id === parseInt(req.params.id));
    res.json(player || {});
});

app.put('/api/player/:id/balance', (req, res) => {
    const player = players.find(p => p.id === parseInt(req.params.id));
    if (player) {
        player.balance = req.body.balance;
        res.json({success: true});
    }
});

app.post('/api/player/:id/withdraw', (req, res) => {
    const player = players.find(p => p.id === parseInt(req.params.id));
    if (player && player.balance >= req.body.amount) {
        player.balance -= req.body.amount;
        transactions.push({playerName: player.username, type: 'Withdrawal', amount: req.body.amount, date: new Date()});
        res.json({success: true});
    } else {
        res.status(400).json({error: 'Insufficient balance'});
    }
});

app.get('/api/transactions', (req, res) => res.json(transactions));
app.get('/api/recent-winners', (req, res) => res.json(winners.slice(-5)));

app.post('/api/add-winner', (req, res) => {
    winners.push({username: req.body.username, winnings: req.body.winnings});
    res.json({success: true});
});

app.put('/api/player/:id', (req, res) => {
    const player = players.find(p => p.id === parseInt(req.params.id));
    if (player) {
        Object.assign(player, req.body);
        res.json({success: true});
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
