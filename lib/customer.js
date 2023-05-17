import { connection } from "../connect.js";

export const getCustomer = async (email) => {
  const [cust] = await connection.execute(
    `SELECT * FROM customers WHERE email = ?`,
    [email]
  );

  return cust;
};

export const addCustomer = async (
  email,
  firstName,
  lastName,
  phone,
  password
) => {
  const [response] = await connection.query(
    "INSERT INTO `customers` (email,first_name,last_name,phone,password) VALUES (?,?,?,?,?)",
    [email, firstName, lastName, phone, password],
    (error, res) => {
      if (error) return res.json({ error: error });
    }
  );

  return response;
};

export const getCustomerById = async (custId) => {
  const [cust] = await connection.execute(
    `SELECT * FROM customers WHERE customer_id = ?`,
    [custId]
  );

  return cust;
};
