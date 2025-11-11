import { SqlDatabase } from "@langchain/classic/sql_db";
import { DataSource } from "typeorm";
import path from "node:path";

let db: SqlDatabase | undefined;
let initPromise: Promise<SqlDatabase> | null = null;

export async function getDb(): Promise<SqlDatabase> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const dbPath =
      process.env.DB_PATH ?? path.resolve(process.cwd(), "netflixdb.sqlite");

    const datasource = new DataSource({
      type: "sqlite",
      database: dbPath,
    });

    try {
      const instance = await SqlDatabase.fromDataSourceParams({
        appDataSource: datasource,
      });
      db = instance;
      return instance;
    } catch (err) {
      // reset so a future call can retry
      initPromise = null;
      throw err;
    }
  })();
  return initPromise;
}

export async function getSchema() {
  const database = await getDb();
  return database.getTableInfo();
}