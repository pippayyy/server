import mysql from "mysql2/promise";

export const connection = await mysql
  .createConnection({
    host: "bsdinh8dsqfyrhcjssyy-mysql.services.clever-cloud.com",
    user: "uyfeqyeoe0ckpsj8",
    password: "ET4aPFBqOPiacApfCqrE",
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
