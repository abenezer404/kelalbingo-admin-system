const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'kelalbingo.db');
const db = new sqlite3.Database(dbPath);

console.log('Using database:', dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      telegram_id TEXT UNIQUE NOT NULL,
      credit_balance DECIMAL DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating agents table:', err);
    else console.log('Agents table created or verified.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS agent_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER REFERENCES agents(id),
      transaction_type TEXT NOT NULL,
      amount DECIMAL NOT NULL,
      target_user_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating agent_transactions table:', err);
    else console.log('Agent transactions table created or verified.');
    
    // Check if the table actually exists
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'", [], (err, rows) => {
      console.log('Tables check:', rows);
    });
  });
});
