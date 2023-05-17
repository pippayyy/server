import mysql from "mysql2/promise";

export const connection = await mysql
  .createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: "bsdinh8dsqfyrhcjssyy",
    port: "3306",
  })
  .then((conn) => {
    console.log("Connected to the MySQL server!");
    return conn;
  })
  .catch((err) => {
    console.error("error: " + err.message);
  });
