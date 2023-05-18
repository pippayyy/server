import {
  getAllCategories,
  getAllProducts,
  getProductsBest,
  getProductsNew,
  getProductsSale,
  getProductInCategory,
  getProductBySearch,
  getProductById,
  postUpdateProdStock,
  getActiveCategories,
} from "./lib/products.js";
import {
  delItemOrderDetails,
  getBasket,
  getLatestOrder,
  getOrderDetails,
  getOrderForCust,
  getOrderForCustProd,
  getPrevOrders,
  postNewOrder,
  postNewOrderDetails,
  postUpdateOrderDetails,
  updateOrder,
} from "./lib/order.js";
import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import cors from "cors";
import nodemailer from "nodemailer";
import { getAllDiscounts, getDiscountCode } from "./lib/discount.js";
import { getDeliveryOptions } from "./lib/delivery.js";
import { addDeliveryAddress } from "./lib/address.js";
import { addPayment } from "./lib/payment.js";
import { addToFavs, delItemFav, getFavs } from "./lib/favs.js";
import { addCustomer, getCustomer, getCustomerById } from "./lib/customer.js";
import {
  addCategory,
  addDiscount,
  addProduct,
  delCategory,
  delDiscount,
  delProduct,
  getCategory,
  getCategoryImg,
  getDiscount,
  getProdImg,
  updateCategory,
  updateDiscount,
  updateProduct,
} from "./lib/admin.js";
import multer from "multer";
import fs from "fs";
import MySQLStore from "express-mysql-session";

const MySQLStoreSession = MySQLStore(session);

const options = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: "3306",
};

const sessionStore = new MySQLStoreSession(options);

const app = express();

const saltRounds = 10;

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  port: 465, // true for 465, false for other ports
  host: "smtp.gmail.com",
  auth: {
    user: process.env.EMAIL_LOGIN,
    pass: process.env.EMAIL_PASS,
  },
  secure: true,
});

var corsOptions = {
  origin: "https://planted.onrender.com",
  credentials: true,
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

//Setting up the session
app.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false,
    key: "session_cookie_name",
    store: sessionStore,
  })
);

// Optionally use onReady() to get a promise that resolves when store is ready.
sessionStore
  .onReady()
  .then(() => {
    // MySQL session store ready for use.
    console.log("PIP MySQLStore ready");
  })
  .catch((error) => {
    // Something went wrong.
    console.log("PIP MySQLStore not ready");
    console.error(error);
  });

//Storage used for image upload - admin functionality
const storageIcons = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "../src/images/icons");
  },
  filename: (req, file, cb) => {
    console.log("file name: ", file);
    console.log("file originalname: ", file.originalname);
    cb(null, Date.now() + file.originalname);
  },
});

//Middleware used for uploading an image
const uploadIcons = multer({ storage: storageIcons });

//Storage used for image upload - admin functionality
const storageImages = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "../src/images");
  },
  filename: (req, file, cb) => {
    console.log("file name: ", file);
    console.log("file originalname: ", file.originalname);
    cb(null, Date.now() + file.originalname);
  },
});

//Middleware used for uploading an image
const uploadImages = multer({ storage: storageImages });

// Log user out
app.delete("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        res.json({ outcome: { message: "failed" } });
      } else {
        res.json({ outcome: { message: "success" } });
      }
    });
  } else {
    res.end();
  }
});

//Used for sign up
app.post("/signup", async (req, res) => {
  //Check if user already exists
  const validUserDetails = await getCustomer(req.body.userEmail);

  //If user with that email address already exists
  if (validUserDetails.length > 0) {
    res.json({
      outcome: {
        status: "danger",
        message: "User already exists!",
      },
    });
  } else {
    //Else - has password
    const hashedPassword = await bcrypt.hash(req.body.userPassword, saltRounds);

    const userAddedResponse = await addCustomer(
      req.body.userEmail,
      req.body.userFname,
      req.body.userLname,
      req.body.userPhone,
      hashedPassword
    );

    if (userAddedResponse.affectedRows > 0) {
      const validUserDetails = await getCustomer(req.body.userEmail);

      //Check if valid user
      if (validUserDetails.length > 0) {
        //Check if passwords match
        bcrypt.compare(
          req.body.userPassword,
          validUserDetails[0].password,
          function (err, result) {
            if (result) {
              // If password is valid, set up session for user
              req.session.userName = validUserDetails[0].email;
              req.session.userId = validUserDetails[0].customer_id;
              req.session.fname = validUserDetails[0].first_name;
              req.session.lname = validUserDetails[0].last_name;

              req.session.save();

              res.json({
                outcome: {
                  status: "success",
                  message: "Sign up and login successful",
                },
              });
            } else {
              res.json({
                outcome: {
                  status: "danger",
                  message: "Incorrect password",
                },
              });
            }
          }
        );
      } else {
        res.json({ outcome: userAddedResponse });
      }
    }
  }
});

//Used to add new products
app.post(
  "/admin/product/add",
  uploadImages.single("image"),
  async (req, res) => {
    //Check if code already exists
    const productAddedResponse = await addProduct(
      req.body.productName,
      req.body.category,
      req.body.productDescrip,
      "../images/" + req.file.filename,
      req.body.productQty,
      req.body.productPrice,
      req.body.discountPerc
    );

    if (productAddedResponse.affectedRows > 0) {
      res.json({
        outcome: {
          status: "success",
          message: "Product created successfully!",
        },
      });
    } else {
      res.json({ outcome: productAddedResponse });
    }
  }
);

//Update discount code detail
app.post("/admin/product/edit", async (req, res) => {
  //Update discount details
  const updateResponse = await updateProduct(
    req.body.dbId,
    req.body.productName,
    req.body.category,
    req.body.productDescrip,
    req.body.productQty,
    req.body.productPrice,
    req.body.discountPerc
  );

  //Check if updated
  if (updateResponse.affectedRows > 0) {
    res.json({
      outcome: {
        status: "success",
        message: "Product updated successfully!",
      },
    });
  } else {
    res.json({
      outcome: {
        status: "danger",
        message: "Failed to make changes",
      },
    });
  }
});

//Used to add new discounts
app.post("/admin/discount/add", async (req, res) => {
  console.log(
    "vars: ",
    req.body.discountCode,
    req.body.discountValue,
    req.body.discountStatus
  );

  //Check if code already exists
  const validDiscountDetails = await getDiscount(req.body.discountCode);

  //If code already exists, send back error
  if (validDiscountDetails.length > 0) {
    res.json({
      outcome: {
        status: "danger",
        message: "Discount code already exists!",
      },
    });
  } else {
    //Else - create discount
    const dicountAddedResponse = await addDiscount(
      req.body.discountCode,
      req.body.discountValue,
      req.body.discountStatus
    );

    if (dicountAddedResponse.affectedRows > 0) {
      res.json({
        outcome: {
          status: "success",
          message: "Discount created successfully!",
        },
      });
    } else {
      res.json({ outcome: dicountAddedResponse });
    }
  }
});

//Del discount
app.post("/admin/discount/del", async (req, res) => {
  console.log("discountId: ", req.body.discountId);
  //Del discount code
  const delResponse = await delDiscount(req.body.discountId);

  //Check if updated
  if (delResponse.affectedRows > 0) {
    res.json({
      outcome: {
        status: "success",
        message: "Discount code deleted successfully!",
      },
    });
  } else {
    res.json({
      outcome: {
        status: "danger",
        message: "Failed to delete",
      },
    });
  }
});

//Del category
app.post("/admin/category/del", async (req, res) => {
  //Get product img url
  const categoryImgPath = await getCategoryImg(req.body.categoryId);

  //Del category
  const delResponse = await delCategory(req.body.categoryId);

  const imgUrl = categoryImgPath[0].img;

  fs.unlinkSync("../src" + imgUrl.slice(2));

  //Check if updated
  if (delResponse.affectedRows > 0) {
    res.json({
      outcome: {
        status: "success",
        message: "Category deleted successfully!",
      },
    });
  } else {
    res.json({
      outcome: {
        status: "danger",
        message: "Failed to delete",
      },
    });
  }
});

//Del product
app.post("/admin/product/del", async (req, res) => {
  //Get product img url
  const prodImgPath = await getProdImg(req.body.productId);

  //Del product
  const delResponse = await delProduct(req.body.productId);

  const imgUrl = prodImgPath[0].img;

  fs.unlinkSync("../src" + imgUrl.slice(2));

  //Check if updated
  if (delResponse.affectedRows > 0) {
    res.json({
      outcome: {
        status: "success",
        message: "Product deleted successfully!",
      },
    });
  } else {
    res.json({
      outcome: {
        status: "danger",
        message: "Failed to delete",
      },
    });
  }
});

//Used to add new categories
app.post(
  "/admin/category/add",
  uploadIcons.single("image"),
  async (req, res) => {
    console.log("req: ", req);
    //Check if category already exists
    const validCategoryDetails = await getCategory(req.body.categoryName);

    //If category already exists, send back error
    if (validCategoryDetails.length > 0) {
      res.json({
        outcome: {
          status: "danger",
          message: "Category name already exists!",
        },
      });
    } else {
      //Else - create category
      const categoryAddedResponse = await addCategory(
        req.body.categoryName,
        req.body.categoryStatus,
        "../images/icons/" + req.file.filename
      );

      if (categoryAddedResponse.affectedRows > 0) {
        res.json({
          outcome: {
            status: "success",
            message: "Category created successfully!",
          },
        });
      } else {
        res.json({ outcome: categoryAddedResponse });
      }
    }
  }
);

//Update discount code detail
app.post("/admin/discount/edit", async (req, res) => {
  //Update discount details
  const updateResponse = await updateDiscount(
    req.body.dbId,
    req.body.discountCode,
    req.body.discountValue,
    req.body.discountStatus
  );

  //Check if updated
  if (updateResponse.affectedRows > 0) {
    res.json({
      outcome: {
        status: "success",
        message: "Discount updated successfully!",
      },
    });
  } else {
    res.json({
      outcome: {
        status: "danger",
        message: "Failed to make changes",
      },
    });
  }
});

//Update discount code detail
app.post("/admin/category/edit", async (req, res) => {
  console.log("req: ", req);

  //Update discount details
  const updateResponse = await updateCategory(
    req.body.dbId,
    req.body.categoryName,
    req.body.categoryImage,
    req.body.categoryStatus
  );

  console.log(
    "pip vars: ",
    req.body.dbId,
    req.body.categoryName,
    req.body.categoryImage,
    req.body.categoryStatus
  );

  console.log("pip updateResponse: ", updateResponse);

  //Check if updated
  if (updateResponse.affectedRows > 0) {
    res.json({
      outcome: {
        status: "success",
        message: "Category updated successfully!",
      },
    });
  } else {
    res.json({
      outcome: {
        status: "danger",
        message: "Failed to make changes",
      },
    });
  }
});

//Used for sign in
app.post("/signin", async (req, res) => {
  const validUserDetails = await getCustomer(req.body.userEmail);

  console.log("req.session.id:", req.session.id);
  console.log("session:", req.session);

  //Check if valid user
  if (validUserDetails.length > 0) {
    //Check if passwords match
    bcrypt.compare(
      req.body.userPassword,
      validUserDetails[0].password,
      function (err, result) {
        if (result) {
          // If password is valid, set up session for user
          req.session.userName = validUserDetails[0].email;
          req.session.userId = validUserDetails[0].customer_id;
          req.session.fname = validUserDetails[0].first_name;
          req.session.lname = validUserDetails[0].last_name;

          req.session.save();

          res.json({
            outcome: { status: "success", message: "Login successful" },
          });
        } else {
          res.json({
            outcome: { status: "danger", message: "Incorrect password" },
          });
        }
      }
    );
  } else {
    res.json({
      outcome: {
        status: "danger",
        message: "User does not exist!",
      },
    });
  }
});

//Get user's session
app.get("/getsession", function (req, res) {
  var sessionDetails = [
    {
      pipTest: "Test123",
      userId: req.session.userId,
      userName: req.session.userName,
      userFname: req.session.fname,
      userLnamereq: req.session.lname,
    },
  ];

  console.log("req.session.id:", req.session.id);
  console.log("session:", req.session);

  res.json({ sessionData: sessionDetails });
});

// Check if session exists
app.get("/checksession", (req, res) => {
  if (req.session && req.session.userId) {
    console.log("checksession - exists");
    res.json({ outcome: { message: "success" } });
  } else {
    res.json({ outcome: { message: "failed" } });
    console.log("checksession - does not exist");
  }
});

// Check if ADMIN session exists
app.get("/checksession/admin", async (req, res) => {
  if (req.session && req.session.userId) {
    const validUserDetails = await getCustomerById(req.session.userId);

    console.log(
      "checksession/admin validUserDetails[0].admin : ",
      validUserDetails[0].admin
    );

    if (validUserDetails.length > 0 && validUserDetails[0].admin == 1) {
      console.log("checksession/admin checksession - exists");
      res.json({ outcome: { message: "success" } });
    } else {
      res.json({ outcome: { message: "failed" } });
      console.log(
        "checksession/admin checksession - user does not have admin priv"
      );
    }
  } else {
    res.json({ outcome: { message: "failed" } });
    console.log("checksession/admin checksession - does not exist");
  }
});

//Used to get all categories
app.get("/categories", async (req, res) => {
  const categories = await getAllCategories();

  res.json({ categories: categories });
});

//Used to get active categories
app.get("/categories/active", async (req, res) => {
  const categories = await getActiveCategories();

  res.json({ categories: categories });
});

//Used to get all products
app.get("/products", async (req, res) => {
  const products = await getAllProducts();

  res.json({ products: products });
});

//Used to get products - new arrivals
app.get("/products/buttNewArrivals", async (req, res) => {
  const products = await getProductsNew();

  res.json({ products: products });
});

//Used to get products - best sellers
app.get("/products/buttBestSellers", async (req, res) => {
  const products = await getProductsBest();

  res.json({ products: products });
});

//Used to get products - sale items
app.get("/products/buttSale", async (req, res) => {
  const products = await getProductsSale();

  res.json({ products: products });
});

//Used to get products - by category id - including Sale and All (not categories)
app.get("/products/category/:id", async (req, res) => {
  const products = await (req.params.id == "sale"
    ? getProductsSale()
    : req.params.id == "all"
    ? getAllProducts()
    : getProductInCategory(req.params.id));

  res.json({ products: products });
});

//Used to get products - using search filter
app.get("/products/category/:id/search/:searchfilter", async (req, res) => {
  const products = await getProductBySearch(req.params.searchfilter);

  res.json({ products: products });
});

//Used to get products - gets all products when search filter is cleared/an empty string
app.get("/products/category/:id/search/", async (req, res) => {
  const products = await getAllProducts();

  res.json({ products: products });
});

//Used to get one product using productID
app.get("/products/:id", async (req, res) => {
  const products = await getProductById(req.params.id);

  res.json({ products: products });
});

//Check if 'Active' row in orders table for a specific customer
app.post("/order/checkactiveorders", async (req, res) => {
  const activeOrdersForCust = await getOrderForCust(
    req.session.userId,
    "Basket"
  );

  res.json({ outcome: activeOrdersForCust });
});

//Get basket details for customer - one row per product in basket - includes product details
app.post("/order/getbasket/orderstatus/:orderstatus", async (req, res) => {
  if (req.session && req.session.userId) {
    const activeOrdersForCust = await getBasket(
      req.session.userId,
      req.params.orderstatus
    );
    res.json({ outcome: activeOrdersForCust });
  } else {
    res.json({ outcome: [] });
  }
});

//Check if 'Active' row in orders table for a specific customer AND return product details (qty) if that product in order already
app.post("/order/checkactiveorders/product/:productid", async (req, res) => {
  const activeOrdersForCust = await getOrderForCustProd(
    req.session.userId,
    "Basket",
    req.params.productid
  );

  res.json({ outcome: activeOrdersForCust });
});

//Post data to add new row in order table
app.post("/order/create", async (req, res) => {
  const outcome = await postNewOrder(req.session.userId);

  res.json({ outcome: outcome });
});

//Post data to add row in order_details table - when item added to bag
app.post(
  "/orderdetails/add/order/:orderid/product/:productid",
  async (req, res) => {
    const outcome = await postNewOrderDetails(
      req.params.orderid,
      req.params.productid
    );

    res.json({ outcome: outcome });
  }
);

//Post data to increase qty of product in order_details table - when item added to bag
app.post(
  "/orderdetails/update/order/:orderid/product/:productid/productqty/:productqty",
  async (req, res) => {
    //If product qty in basket set to zero, remove it from the bag
    if (req.params.productqty == 0) {
      const outcome = await delItemOrderDetails(
        req.params.orderid,
        req.params.productid
      );
      res.json({ outcome: outcome });
    } else {
      const outcome = await postUpdateOrderDetails(
        req.params.orderid,
        req.params.productid,
        req.params.productqty
      );
      res.json({ outcome: outcome });
    }
  }
);

//Decrease stock in product table when item added to bag
app.post(
  "/update/stock/product/:productid/productqty/:productqty",
  async (req, res) => {
    const outcome = await postUpdateProdStock(
      req.params.productid,
      req.params.productqty
    );

    res.json({ outcome: outcome });
  }
);

//Check if discount code is valid
app.post("/checkdiscount/code/:discountcode", async (req, res) => {
  const outcome = await getDiscountCode(req.params.discountcode);

  res.json({ outcome: outcome });
});

//Used to get all active delivery options
app.get("/order/getdeliveryoptions", async (req, res) => {
  const options = await getDeliveryOptions();

  res.json({ outcome: options });
});

//Check if discount code is valid
app.post("/order/placeorder", async (req, res) => {
  //Add delivery address to address table - return new auto address id
  const deliveryAddressId = await addDeliveryAddress(
    req.body.houseDelivery,
    req.body.streetDelivery,
    req.body.cityDelivery,
    req.body.countyDelivery,
    req.body.postcodeDelivery
  );

  //Check if billing address was marked as the same as delivery address, if not add billing address to address table
  const billingAddressId = req.body.addressesAreSame
    ? deliveryAddressId
    : //Add billing address to address table - return new auto address id
      await addDeliveryAddress(
        req.body.houseBilling,
        req.body.streetBilling,
        req.body.cityBilling,
        req.body.countyBilling,
        req.body.postcodeBilling
      );

  //Add payment info to payment table - return new payment id
  const paymentId = await addPayment(
    req.body.cardNum,
    req.body.cardExpiry,
    req.body.cardSecurityCode,
    billingAddressId.insertId,
    req.body.paymentType,
    req.body.paymentTotal
  );

  //Add detail to orders table - add order date and change order_status to Ordered
  const orderDetail = await updateOrder(
    deliveryAddressId.insertId,
    req.body.discountId,
    req.body.deliveryMethodId,
    paymentId.insertId,
    "Ordered",
    req.body.orderId
  );

  res.json({
    outcome: { orderDetail: orderDetail, userEmail: req.session.userName },
  });

  //Get all items in order (Note: some will be inactive and not part of actual order, so needs filtering)
  const getOrder = await getOrderDetails(req.body.orderId);

  const OrderDetailsActive = getOrder.filter(
    (d) => d.virtual_status == "Active"
  );

  const OrderDetailsInactive = getOrder.filter(
    (d) => d.virtual_status == "Inactive"
  );

  //Remove stock from products table when order complete
  OrderDetailsActive.map((item) =>
    postUpdateProdStock(item.product_id, -item.product_qty)
  );

  //Add inactive items to favourites and remove them from order details
  if (OrderDetailsInactive.length > 0) {
    OrderDetailsInactive.map((item) =>
      addToFavs(req.session.userId, item.product_id)
    );
    OrderDetailsInactive.map((item) =>
      delItemOrderDetails(item.order_id, item.product_id)
    );
  }

  if (orderDetail.affectedRows > 0) {
    const mailData = {
      from: "plantedhello@gmail.com", // sender address
      to: req.session.userName, // list of receivers
      cc: "pippa.austin@live.co.uk",
      subject: "Order confirmation PLANTED#" + req.body.orderId,
      // text: "That was easy!",
      html: `<!DOCTYPE html>
      <html>
      <head>
      <title></title>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <style type="text/css">
      
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; }
      
      img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
      table { border-collapse: collapse !important; }
      body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
      
      
      a[x-apple-data-detectors] {
          color: inherit !important;
          text-decoration: none !important;
          font-size: inherit !important;
          font-family: inherit !important;
          font-weight: inherit !important;
          line-height: inherit !important;
      }
      
      @media screen and (max-width: 480px) {
          .mobile-hide {
              display: none !important;
          }
          .mobile-center {
              text-align: center !important;
          }
      }
      div[style*="margin: 16px 0;"] { margin: 0 !important; }
      </style>
      <body style="margin: 0 !important; padding: 0 !important; background-color: #eeeeee;" bgcolor="#eeeeee">
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
              <td align="center" style="background-color: #EFF7EB;" bgcolor="#EFF7EB">
              
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                  <tr>
                      <td align="center" valign="top" style="font-size:0; padding: 35px;" bgcolor="#74A860">
                     
      center                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:500px;">
                              <tr>
                                  <td align="center" valign="top" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 36px; font-weight: 800; line-height: 48px;" class="mobile-center">
                                      <h1 style="font-size: 32px; font-weight: 800; margin: 0; color: #ffffff;">Planted Order Confirmation</h1>
                                  </td>
                              </tr>
                          </table>
                      
                      <div style="display:inline-block; max-width:50%; min-width:100px; vertical-align:top; width:100%;" class="mobile-hide">
                          <table align="left" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:300px;">
                              <tr>
                                  <td align="right" valign="top" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 48px; font-weight: 400; line-height: 48px;">
                                      <table cellspacing="0" cellpadding="0" border="0" align="right">
                                          <tr>
                                              <td style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400;">
                                              </td>
                                              <td style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 24px;">
      
                                              </td>
                                          </tr>
                                      </table>
                                  </td>
                              </tr>
                          </table>
                      </div>
                    
                      </td>
                  </tr>
                  <tr>
                      <td align="center" style="padding: 35px 35px 20px 35px; background-color: #ffffff;" bgcolor="#ffffff">
                      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                          <tr>
                              <td align="center" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                  <img src="data:image/png;base64,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" width="125" height="120" style="display: block; border: 0px;" /><br>
                                  <h2 style="font-size: 30px; font-weight: 800; line-height: 36px; color: #333333; margin: 0;">
                                      Thank You For Your Order!
                                  </h2>
                              </td>
                          </tr>
                          <tr>
                              <td align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding-top: 10px;">
                                  <p style="font-size: 16px; font-weight: 400; line-height: 24px; color: #777777;">
                                      Your order is now confirmed, we hope you love it! Please see order details below.
                                  </p>
                              </td>
                          </tr>
                          <tr>
                              <td align="left" style="padding-top: 20px">
                                  <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                      <tr>
                                          <td width="75%" align="left" bgcolor="#eeeeee" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px;">
                                              Order ID
                                          </td>
                                          <td width="25%" align="left" bgcolor="#eeeeee" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px;">
                                              PLANTED#${req.body.orderId}
                                          </td>
                                      </tr>
                                      ${OrderDetailsActive.map(
                                        (item) => `<tr>
                                      <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                          ${item.name} (x${item.product_qty})
                                      </td>
                                      <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">
                                      £${
                                        item.discount_percent > 0
                                          ? (
                                              item.price *
                                              (1 - item.discount_percent * 0.01)
                                            ).toFixed(2)
                                          : item.price
                                      }
                                      </td>
                                  </tr>`
                                      )}
                                  </table>
                              </td>
                          </tr>
                          <tr>
                              <td align="left" style="padding-top: 20px;">
                                  <table cellspacing="0" cellpadding="0" border="0" width="100%">                                 
                                  <tr>
                                  <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px; border-top: 3px solid #eeeeee;">
                                      Delivery
                                  </td>
                                  <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px; border-top: 3px solid #eeeeee;">
                                  ${
                                    OrderDetailsActive[0].delivery_price == 0
                                      ? "FREE"
                                      : "£" +
                                        OrderDetailsActive[0].delivery_price
                                  }
                                  </td>
                              </tr>
                                  ${
                                    OrderDetailsActive[0].discount_id == null
                                      ? `&nbsp`
                                      : `<tr>
                                        <td
                                          width="75%"
                                          align="left"
                                          style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;"
                                        >
                                          Discount
                                        </td>
                                        <td
                                          width="25%"
                                          align="left"
                                          style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;"
                                        >
                                          ${OrderDetailsActive[0].discount_value}%
                                        </td>
                                      </tr>`
                                  }
                                      <tr>
                                          <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-bottom: 3px solid #eeeeee;">
                                              TOTAL
                                          </td>
                                          <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 800; line-height: 24px; padding: 10px; border-bottom: 3px solid #eeeeee;">
                                              £${req.body.paymentTotal}
                                          </td>
                                      </tr>
                                  </table>
                              </td>
                          </tr>
                      </table>
                      
                      </td>
                  </tr>
                   <tr>
                      <td align="left" height="100%" valign="top" width="100%" style="padding: 0 35px 35px 35px; background-color: #ffffff;" bgcolor="#ffffff">
                      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:660px;">
                          <tr>
                              <td align="center" valign="top" style="font-size:0;">
                                  <div style="display:inline-block; max-width:50%; min-width:240px; vertical-align:top; width:100%;">
      
                                      <table align="left" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:300px;">
                                          <tr>
                                              <td align="left" valign="top" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px;">
                                                  <p style="font-weight: 800;">Delivery Address</p>
                                                  <p>
                                                  ${req.body.houseDelivery}
                                                    ${
                                                      req.body.streetDelivery
                                                    }<br>
                                                    ${req.body.cityDelivery}<br>
                                                    ${
                                                      req.body.countyDelivery
                                                    }<br>
                                                    ${
                                                      req.body.postcodeDelivery
                                                    }<br>
                                                  </p>
                                              </td>
                                          </tr>
                                      </table>
                                      </div>
                                      <div style="display:inline-block; max-width:50%; min-width:240px; vertical-align:top; width:100%;">
                                      <table align="left" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:300px;">
                                          <tr>
                                              <td align="left" valign="top" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px;">
                                                  <p style="font-weight: 800;">Billing Address</p>
                                                      ${
                                                        req.body
                                                          .addressesAreSame
                                                          ? `<p>
                                                            ${req.body.houseDelivery} 
                                                            ${req.body.streetDelivery} <br>
                                                            ${req.body.cityDelivery} <br>
                                                            ${req.body.countyDelivery} <br>
                                                            ${req.body.postcodeDelivery} <br>
                                                          </p>`
                                                          : `<p>
                                                            ${req.body.houseBilling} 
                                                            ${req.body.streetBilling} <br>
                                                            ${req.body.cityBilling} <br>
                                                            ${req.body.countyBilling} <br>
                                                            ${req.body.postcodeBilling} <br>
                                                          </p>`
                                                      }
      
                                              </td>
                                          </tr>
                                      </table>
                                  </div>
                                  <div style="display:inline-block; max-width:50%; min-width:240px; vertical-align:top; width:100%;">
                                      <table align="left" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:300px;">
                                          <tr>
                                              <td align="left" valign="top" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px;">
                                                  <p style="font-weight: 800;">Estimated Delivery Date</p>
                                                  <p>${
                                                    OrderDetailsActive[0]
                                                      .estimated_delivery_date
                                                  }</p>
                                              </td>
                                          </tr>
                                      </table>
                                  </div>
                              </td>
                          </tr>
                      </table>
                      </td>
                  </tr>
              </table>
              </td>
          </tr>
      </table>
          
      </body>
      </html>
      `,
    };

    transporter.sendMail(mailData, function (err, info) {
      if (err) console.log(err);
      else console.log(info);
    });
  }
});

//Get customer's favs
app.get("/favourties", async (req, res) => {
  console.log("req.session: ", req.session.userId ? req.session.userId : null);
  const favs = await getFavs(req.session.userId ? req.session.userId : null);

  res.json({ outcome: favs });
});

//Get prev orders for customer
app.get("/getorders", async (req, res) => {
  const orders = await getPrevOrders(req.session.userId);

  res.json({
    outcome: {
      orders: orders,
      userEmail: req.session.userName,
      userFname: req.session.fname,
    },
  });
});

//Get prev orders for customer
app.get("/getorder/latest", async (req, res) => {
  const orders = await getLatestOrder(req.session.userId);

  res.json({ outcome: orders });
});

//Get prev order details
app.get("/getorders/orderid/:orderid", async (req, res) => {
  const orders = await getOrderDetails(req.params.orderid);

  res.json({ outcome: orders });
});

//Delete item from favs
app.post("/favourites/del/prod/:prodId", async (req, res) => {
  const outcome = await delItemFav(req.session.userId, req.params.prodId);

  res.json({ outcome: outcome });
});

//Add item from favs
app.post("/favourites/add/prod/:prodId", async (req, res) => {
  const outcome = await addToFavs(req.session.userId, req.params.prodId);

  res.json({ outcome: outcome });
});

//Get all discount codes
app.get("/discounts", async (req, res) => {
  const discounts = await getAllDiscounts();

  res.json({ outcome: discounts });
});

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}.`);
});
