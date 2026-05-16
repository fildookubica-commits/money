-- Databázová schéma pre Budget App
-- Spusti raz pri prvom nasadení: wrangler d1 execute budget-db --file=schema.sql --remote

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  account_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  payee TEXT NOT NULL,
  amount REAL NOT NULL,
  receipt_id TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS envelopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  budgeted REAL NOT NULL DEFAULT 0,
  month TEXT NOT NULL,
  UNIQUE(category, month)
);

CREATE TABLE IF NOT EXISTS recurring (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'mesačne',
  next_date TEXT NOT NULL,
  category TEXT NOT NULL,
  account_id INTEGER,
  active INTEGER DEFAULT 1,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Predvolené dáta
INSERT OR IGNORE INTO accounts (id, name, balance) VALUES (1, 'Bežný účet', 0);

INSERT OR IGNORE INTO envelopes (category, budgeted, month) VALUES
  ('Potraviny', 350, '2026-05'),
  ('Bývanie', 600, '2026-05'),
  ('Doprava', 100, '2026-05'),
  ('Zábava', 150, '2026-05'),
  ('Predplatné', 40, '2026-05');

CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_envelopes_month ON envelopes(month);
