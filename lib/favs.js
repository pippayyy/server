import { connection } from "../connect.js";

export const addToFavs = async (custId, prodId) => {
  const [response] = await connection.query(
    "INSERT INTO `favourites` (customer_id,product_id) VALUES (?,?)",
    [custId, prodId],
    (error, res) => {
      if (error) return res.json({ error: error });
    }
  );

  return response;
};

export const getFavs = async (custId) => {
  const [favs] = await connection.execute(
    `SELECT favourites.*, product.*, sum(order_details_virtual.product_qty) AS virtual_stock_reserved
    FROM favourites
    LEFT JOIN product ON product.product_id = favourites.product_id
    LEFT JOIN order_details ON order_details.product_id = favourites.product_id
        LEFT JOIN (SELECT product_id AS details_product_id,product_qty,date_added,order_details.order_id AS details_order_id FROM order_details
       LEFT JOIN orders ON orders.order_id = order_details.order_id
        WHERE orders.order_status = 'Basket' AND date_added BETWEEN DATE_ADD(NOW(), INTERVAL -1 HOUR) AND NOW()) AS order_details_virtual
         ON order_details_virtual.details_product_id = product.product_id
    WHERE customer_id = ?
    GROUP BY favourites.customer_id,favourites.product_id;`,
    [custId]
  );

  return favs;
};

export const delItemFav = async (custId, prodId) => {
  const [response] = await connection.query(
    "DELETE FROM `favourites` WHERE customer_id = ? AND product_id = ?",
    [custId, prodId],
    (error, res) => {
      if (error) return res.json({ error: error });
    }
  );

  return response;
};
