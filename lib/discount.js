import { connection } from "../connect.js";

export const getDiscountCode = async (codeInput) => {
  const [codeResult] = await connection.execute(
    "SELECT * FROM discount_code WHERE discount_code = ? AND discount_status = 1;",
    [codeInput]
  );

  return codeResult;
};

export const getAllDiscounts = async () => {
  const [codeResult] = await connection.execute("SELECT * FROM discount_code");

  return codeResult;
};
