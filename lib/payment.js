import { connection } from "../connect.js";

export const addPayment = async (
  cardNum,
  cardExpiry,
  cardSecurityCode,
  billingAddressId,
  paymentType,
  paymentTotal
) => {
  const [response] = await connection.query(
    "INSERT INTO `payment` (payment_type,card_number,expiry_date,security_code,billing_address_id,total_payment) VALUES (?,?,?,?,?,?)",
    [
      paymentType,
      cardNum,
      cardExpiry,
      cardSecurityCode,
      billingAddressId,
      paymentTotal,
    ],
    (error, res) => {
      if (error) return res.json({ error: error });
    }
  );

  return response;
};
