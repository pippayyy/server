import { connection } from "../connect.js";

export const getAllCategories = async () => {
  const [categories] = await connection.execute("SELECT * FROM `categories`;");

  return categories;
};

export const getActiveCategories = async () => {
  const [categories] = await connection.execute(
    "SELECT * FROM `categories` WHERE `status_active` = 1;"
  );

  return categories;
};

export const getAllProducts = async () => {
  const [products] = await connection.execute(
    `SELECT product.*,
        sum(product_qty) AS virtual_stock_reserved,
        categories.name AS category_name
        FROM product
        LEFT JOIN (SELECT product_id AS details_product_id,product_qty,date_added,order_details.order_id AS details_order_id FROM order_details
        LEFT JOIN orders ON orders.order_id = order_details.order_id
        WHERE orders.order_status = 'Basket' AND date_added BETWEEN DATE_ADD(NOW(), INTERVAL -1 HOUR) AND NOW()) AS order_details
        ON order_details.details_product_id = product.product_id
        LEFT JOIN categories ON categories.id = product.category_id
        GROUP BY product_id
        ORDER BY product_id DESC;`
  );

  return products;
};

export const getProductsNew = async () => {
  const [products] = await connection.execute(
    `SELECT product.*,
    sum(product_qty) AS virtual_stock_reserved
    FROM product
    LEFT JOIN (SELECT product_id AS details_product_id,product_qty,date_added,order_details.order_id AS details_order_id FROM order_details
    LEFT JOIN orders ON orders.order_id = order_details.order_id
    WHERE orders.order_status = 'Basket' AND date_added BETWEEN DATE_ADD(NOW(), INTERVAL -1 HOUR) AND NOW()) AS order_details
    ON order_details.details_product_id = product.product_id
    GROUP BY product_id
    ORDER BY created_on DESC LIMIT 6;`
  );

  return products;
};

export const getProductsBest = async () => {
  const [products] = await connection.execute(
    `SELECT product.*,
    sum(order_details.product_qty) AS virtual_stock_reserved,
    sum(order_details_ordered.product_qty) AS ordered_stock
    FROM product
    LEFT JOIN (SELECT product_id AS details_product_id,product_qty,date_added,order_details.order_id AS details_order_id FROM order_details
    LEFT JOIN orders ON orders.order_id = order_details.order_id
    WHERE orders.order_status = 'Basket' AND date_added BETWEEN DATE_ADD(NOW(), INTERVAL -1 HOUR) AND NOW()) AS order_details
    ON order_details.details_product_id = product.product_id
	  LEFT JOIN (SELECT product_id AS details_product_id,product_qty,date_added,order_details.order_id AS details_order_id FROM order_details
    LEFT JOIN orders ON orders.order_id = order_details.order_id
    WHERE orders.order_status = 'Ordered') AS order_details_ordered
    ON order_details.details_product_id = product.product_id
    GROUP BY product_id
    ORDER BY ordered_stock DESC LIMIT 6;`
  );

  return products;
};

export const getProductsSale = async () => {
  const [products] = await connection.execute(
    `SELECT product.*,
    sum(product_qty) AS virtual_stock_reserved
    FROM product
    LEFT JOIN (SELECT product_id AS details_product_id,product_qty,date_added,order_details.order_id AS details_order_id FROM order_details
    LEFT JOIN orders ON orders.order_id = order_details.order_id
    WHERE orders.order_status = 'Basket' AND date_added BETWEEN DATE_ADD(NOW(), INTERVAL -1 HOUR) AND NOW()) AS order_details
    ON order_details.details_product_id = product.product_id
    WHERE discount_percent >0
    GROUP BY product_id;`
  );

  return products;
};

export const getProductInCategory = async (categoryId) => {
  const [products] = await connection.execute(
    `SELECT product.*,
    sum(product_qty) AS virtual_stock_reserved
    FROM product
    LEFT JOIN (SELECT product_id AS details_product_id,product_qty,date_added,order_details.order_id AS details_order_id FROM order_details
    LEFT JOIN orders ON orders.order_id = order_details.order_id
    WHERE orders.order_status = 'Basket' AND date_added BETWEEN DATE_ADD(NOW(), INTERVAL -1 HOUR) AND NOW()) AS order_details
    ON order_details.details_product_id = product.product_id
    WHERE category_id = ?
    GROUP BY product_id;`,
    [categoryId]
  );

  return products;
};

export const getProductBySearch = async (searchString) => {
  const [products] = await connection.execute(
    `SELECT product.*,
    sum(product_qty) AS virtual_stock_reserved
    FROM product
    LEFT JOIN (SELECT product_id AS details_product_id,product_qty,date_added,order_details.order_id AS details_order_id FROM order_details
    LEFT JOIN orders ON orders.order_id = order_details.order_id
    WHERE orders.order_status = 'Basket' AND date_added BETWEEN DATE_ADD(NOW(), INTERVAL -1 HOUR) AND NOW()) AS order_details
    ON order_details.details_product_id = product.product_id
    WHERE name LIKE ?
    GROUP BY product_id`,
    ["%" + searchString + "%"]
  );

  return products;
};

export const getProductById = async (prodId) => {
  const [products] = await connection.execute(
    `SELECT product.*, categories.name AS category_name, product_details.product_details_json,
sum(product_qty) AS virtual_stock_reserved
FROM product
LEFT JOIN categories ON product.category_id = categories.id
LEFT JOIN product_details ON product.product_id = product_details.product_id
LEFT JOIN 
	(SELECT product_id AS details_product_id,product_qty,date_added,order_details.order_id 
    AS details_order_id FROM order_details
    LEFT JOIN orders ON orders.order_id = order_details.order_id
    WHERE orders.order_status = 'Basket' AND date_added BETWEEN DATE_ADD(NOW(), INTERVAL -1 HOUR) AND NOW())
AS order_details
ON order_details.details_product_id = product.product_id
WHERE product.product_id = ?
GROUP BY product.product_id;`,
    [prodId]
  );

  return products;
};

export const postUpdateProdStock = async (prodId, prodQty) => {
  const [response] = await connection.query(
    "UPDATE `product` SET stock = stock + ? WHERE product_id = ?;",
    [prodQty, prodId],
    (error, res) => {
      if (error) return res.json({ error: error });
    }
  );

  return response;
};
