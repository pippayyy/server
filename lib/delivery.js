import { connection } from "../connect.js";

export const getDeliveryOptions = async () => {
  const [deliveryOptions] = await connection.execute(
    "SELECT delivery_method.*, DATE_FORMAT(DATE_ADD(NOW(), INTERVAL + delivery_method.estimate_working_days DAY),'%D %M %Y') AS estimated_delivery_date FROM delivery_method WHERE method_status = 1;"
  );

  return deliveryOptions;
};
