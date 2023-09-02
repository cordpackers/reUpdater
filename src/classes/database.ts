import * as sqlite3 from "sqlite3";

class SQLiteDB {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("[Updater] Error opening database:", err.message);
      } else {
        console.log("[Updater] Connected to the database");
      }
    });
  }

  async runQuery(query: string, params: any[] = []): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err.message);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close(): void {
    this.db.close((err) => {
      if (err) {
        console.error("[Updater] Error closing database:", err.message);
      } else {
        console.log("[Updater] Database connection closed");
      }
    });
  }
}

export {SQLiteDB}
