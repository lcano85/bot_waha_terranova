const PAUSE = 30 * 60 * 1000;

function createAttention(db, now = Date.now) {
  db.exec(`CREATE TABLE IF NOT EXISTS advisor_attention (
    chat_id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, resume_at INTEGER
  )`);
  // Apply the automatic deadline to existing and new conversations.
  db.prepare('UPDATE advisor_attention SET resume_at = started_at + ? WHERE resume_at IS NULL OR resume_at > started_at + ?').run(PAUSE, PAUSE);
  return {
    start(chatId) {
      db.prepare(`INSERT INTO advisor_attention VALUES (?, ?, ?)
        ON CONFLICT(chat_id) DO UPDATE SET started_at = excluded.started_at, resume_at = excluded.resume_at`).run(chatId, now(), now() + PAUSE);
    },
    finish(chatId) {
      // Repeated clicks must not extend the waiting period.
      const time = now();
      db.prepare('UPDATE advisor_attention SET resume_at = ? WHERE chat_id = ? AND resume_at > ?').run(time, chatId, time);
      return db.prepare('SELECT * FROM advisor_attention WHERE chat_id = ?').get(chatId);
    },
    get(chatId) {
      return db.prepare('SELECT * FROM advisor_attention WHERE chat_id = ?').get(chatId);
    },
    consume(chatId) {
      const row = this.get(chatId);
      if (!row) return 'bot';
      if (row.resume_at === null || now() < row.resume_at) return 'paused';
      db.prepare('DELETE FROM advisor_attention WHERE chat_id = ?').run(chatId);
      return 'resumed';
    },
    list() {
      return db.prepare('SELECT * FROM advisor_attention ORDER BY started_at DESC').all().map(row => ({
        ...row, status: row.resume_at === null ? 'active' : now() < row.resume_at ? 'waiting' : 'ready'
      }));
    }
  };
}

module.exports = { createAttention };
