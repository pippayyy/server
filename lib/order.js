import { connection } from "../connect.js";

export const getOrderForCust = async (custId, orderStatus) => {
  const [orders] = await connection.execute(
    "SELECT * FROM `orders` WHERE `customer_id` = ? AND order_status = ?",
    [custId, orderStatus]
  );

  return orders;
};

export const getOrderForCustProd = async (custId, orderStatus, prodId) => {
  const [orders] = await connection.execute(
    "SELECT * FROM `orders` LEFT JOIN (SELECT product_id,product_qty,date_added,order_id AS details_order_id  FROM `order_details` WHERE product_id = ?) AS `order_details` ON order_details.details_order_id = orders.order_id WHERE `customer_id` = ? AND order_status = ?",
    [prodId, custId, orderStatus]
  );

  return orders;
};

export const getBasket = async (custId, orderStatus) => {
  const [orders] = await connection.execute(
    `SELECT orders.*, order_details.product_id, order_details.product_qty,
    order_details.date_added,order_details.order_id AS details_order_id, product.*,
    sum(order_details_virtual.product_qty) AS virtual_stock_reserved,
    CASE (order_details.date_added BETWEEN DATE_ADD(NOW(), INTERVAL -1 HOUR) AND NOW()) WHEN true THEN 'Active' ELSE 'Inactive' END AS virtual_status
    FROM orders LEFT JOIN order_details ON order_details.order_id = orders.order_id 
    LEFT JOIN product ON product.product_id = order_details.product_id
    LEFT JOIN (SELECT product_id AS details_product_id,product_qty,date_added,order_details.order_id AS details_order_id FROM order_details
    LEFT JOIN orders ON orders.order_id = order_details.order_id
    WHERE orders.order_status = 'Basket' AND date_added BETWEEN DATE_ADD(NOW(), INTERVAL -1 HOUR) AND NOW()) AS order_details_virtual
     ON order_details_virtual.details_product_id = product.product_id
    WHERE customer_id = ? AND order_status = ?
    GROUP BY orders.order_id,order_details.product_id;`,
    [custId, orderStatus]
  );

  return orders;
};

export const postNewOrder = async (custId) => {
  const [response] = await connection.query(
    "INSERT INTO `orders` (customer_id,order_status) VALUES (?,?)",
    [custId, "Basket"],
    (error, res) => {
      if (error) return res.json({ error: error });
    }
  );

  return response;
};

export const postNewOrderDetails = async (orderId, prodId) => {
  const [response] = await connection.query(
    "INSERT INTO `order_details` (order_id,product_id,product_qty) VALUES (?,?,?)",
    [orderId, prodId, 1],
    (error, res) => {
      if (error) return res.json({ error: error });
    }
  );

  return response;
};

export const postUpdateOrderDetails = async (orderId, prodId, prodQty) => {
  const [response] = await connection.query(
    "UPDATE `order_details` SET product_qty = ? WHERE order_id = ? AND product_id = ?",
    [prodQty, orderId, prodId],
    (error, res) => {
      if (error) return res.json({ error: error });
    }
  );

  return response;
};

export const delItemOrderDetails = async (orderId, prodId) => {
  const [response] = await connection.query(
    "DELETE FROM `order_details` WHERE order_id = ? AND product_id = ?",
    [orderId, prodId],
    (error, res) => {
      if (error) return res.json({ error: error });
    }
  );

  return response;
};

export const updateOrder = async (
  deliveryAddressId,
  discountId,
  deliveryMethodId,
  paymentId,
  orderStatus,
  orderId
) => {
  const [response] = await connection.query(
    "UPDATE `orders` SET delivery_address_id = ?, discount_id = ?, delivery_method_id = ?, payment_id =?, order_status =? WHERE order_id = ?",
    [
      deliveryAddressId,
      discountId,
      deliveryMethodId,
      paymentId,
      orderStatus,
      orderId,
    ],
    (error, res) => {
      if (error) return res.json({ error: error });
    }
  );

  return response;
};

export const getOrderDetails = async (orderId) => {
  const [orderDetails] = await connection.execute(
    `SELECT orders.*, order_details.product_id, order_details.product_qty,
    order_details.date_added,order_details.order_id AS details_order_id, product.*,
    sum(order_details_virtual.product_qty) AS virtual_stock_reserved,
    CASE (order_details.date_added BETWEEN DATE_ADD(NOW(), INTERVAL -1 HOUR) AND NOW()) WHEN true THEN 'Active' ELSE 'Inactive' END AS virtual_status,
    delivery_method.delivery_price,
    discount_code.discount_value,
    DATE_FORMAT(DATE_ADD(order_date, INTERVAL delivery_method.estimate_working_days DAY),'%D %M %Y') AS estimated_delivery_date,
    DATE_FORMAT(order_date,'%D %M %Y') AS order_date_formatted,
    address_delivery.*,
    address_billing.address_id AS address_id_billing,
    address_billing.address_house AS address_house_billing,
    address_billing.street AS street_billing,
    address_billing.city AS city_billing,
    address_billing.county AS county_billing,
    address_billing.postcode AS postcode_billing,
    payment.payment_type,
    payment.total_payment
    FROM orders LEFT JOIN order_details ON order_details.order_id = orders.order_id 
    LEFT JOIN product ON product.product_id = order_details.product_id
    LEFT JOIN (SELECT product_id AS details_product_id,product_qty,date_added,order_details.order_id AS details_order_id FROM order_details
    LEFT JOIN orders ON orders.order_id = order_details.order_id
     WHERE date_added BETWEEN DATE_ADD(NOW(), INTERVAL -1 HOUR) AND NOW()) AS order_details_virtual
     ON order_details_virtual.details_product_id = product.product_id
    LEFT JOIN delivery_method ON delivery_method.delivery_method_id = orders.delivery_method_id
    LEFT JOIN discount_code ON discount_code.discount_id = orders.discount_id
    LEFT JOIN address AS address_delivery ON address_delivery.address_id = orders.delivery_address_id
    LEFT JOIN payment ON payment.payment_id = orders.payment_id
    LEFT JOIN address AS address_billing ON address_billing.address_id = payment.billing_address_id
    WHERE orders.order_id = ?
    GROUP BY orders.order_id,order_details.product_id;`,
    [orderId]
  );

  return orderDetails;
};

export const getPrevOrders = async (custId) => {
  const [orders] = await connection.execute(
    "SELECT *, DATE_FORMAT(order_date,'%D %M %Y') AS order_date_formatted FROM `orders` WHERE `customer_id` = ? AND order_status != 'Basket' ORDER BY order_id desc",
    [custId]
  );

  return orders;
};

export const getLatestOrder = async (custId) => {
  const [orders] = await connection.execute(
    `SELECT orders.*, address_delivery.*, DATE_FORMAT(order_date,'%D %M %Y') AS order_date_formatted 
    FROM orders
    LEFT JOIN address AS address_delivery ON address_delivery.address_id = orders.delivery_address_id
    WHERE customer_id = ? AND order_status != 'Basket'
    ORDER BY order_id desc LIMIT 1;`,
    [custId]
  );

  return orders;
};
