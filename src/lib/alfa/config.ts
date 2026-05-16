const sandbox = process.env.ALFA_SANDBOX !== "false";

export const alfaConfig = {
  sandbox,
  hsUrl: sandbox
    ? "https://sandbox.bankalfalah.com/HS/HS/HS"
    : "https://payments.bankalfalah.com/HS/HS/HS",
  ssoUrl: sandbox
    ? "https://sandbox.bankalfalah.com/SSO/SSO/SSO"
    : "https://payments.bankalfalah.com/SSO/SSO/SSO",
  ipnBaseUrl: sandbox
    ? "https://sandbox.bankalfalah.com/HS/api/IPN/OrderStatus"
    : "https://payments.bankalfalah.com/HS/api/IPN/OrderStatus",
  merchantId: process.env.ALFA_MERCHANT_ID ?? "",
  storeId: process.env.ALFA_STORE_ID ?? "",
  merchantHash: process.env.ALFA_MERCHANT_HASH ?? "",
  merchantUsername: process.env.ALFA_MERCHANT_USERNAME ?? "",
  merchantPassword: process.env.ALFA_MERCHANT_PASSWORD ?? "",
  key1: process.env.ALFA_KEY1 ?? "",
  key2: process.env.ALFA_KEY2 ?? "",
  channelId: "1001",
  secretKey: process.env.ALFA_SECRET_KEY ?? "",
};
