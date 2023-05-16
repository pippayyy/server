import { connection } from "../connect.js";

export const addDeliveryAddress = async (
  house,
  street,
  city,
  county,
  postcode
) => {
  const [response] = await connection.query(
    "INSERT INTO `address` (address_house,street,city,county,postcode) VALUES (?,?,?,?,?)",
    [house, street, city, county, postcode],
    (error, res) => {
      if (error) return res.json({ error: error });
    }
  );

  return response;
};
