import Database, * as BetterSqlite3 from "better-sqlite3";

class SQLiteDB {
  db!: BetterSqlite3.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
  }

  runQuery(query: string, params: any[] = []): any {
    const stmt = this.db.prepare(query);
    if (query.trim().toUpperCase().startsWith("SELECT")) {
      return stmt.all(...params);
    } else {
      stmt.run(...params);
    }
  }

  close(): void {
    this.db.close();
  }
}

export { SQLiteDB };
