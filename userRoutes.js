const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { ObjectId } = require("mongodb");
const logger = require("./logger");

// Register User
async function registerUser(db, email, password) {
  logger.info("registerUser: START");

  const usersCollection = db.collection("users");
  const existingUser = await usersCollection.findOne({ email });

  if (existingUser) {
    logger.warn(`registerUser: User already exists - ${email}`);
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await usersCollection.insertOne({
    email,
    password: hashedPassword,
    cart: [],
    mod: false,
  });

  logger.info(`registerUser: SUCCESS - User registered with ID ${result.insertedId}`);
  return result.insertedId;
}

// Login User
async function loginUser(db, email, password) {
  logger.info("loginUser: START");

  const usersCollection = db.collection("users");
  const user = await usersCollection.findOne({ email });

  if (!user) {
    logger.warn(`loginUser: User not found - ${email}`);
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    logger.warn("loginUser: Invalid password attempt");
    throw new Error("Invalid password");
  }

  const token = jwt.sign({ email: user.email, mod: user.mod }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  logger.info(`loginUser: SUCCESS - Token generated for ${email}`);
  return token;
}

// Gets active user
async function getCurrentUser(event, db) {
  logger.info("getCurrentUser: START");

  const token = event.headers.Authorization || event.headers.authorization;
  if (!token) {
    logger.warn("getCurrentUser: No token provided");
    return { statusCode: 401, body: JSON.stringify({ message: "No token provided" }) };
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email: decoded.email });

    if (!user) {
      logger.warn(`getCurrentUser: User not found - ${decoded.email}`);
      return { statusCode: 404, body: JSON.stringify({ message: "User not found" }) };
    }

    logger.info(`getCurrentUser: SUCCESS - Authenticated ${decoded.email}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ email: user.email, mod: user.mod || false }),
    };
  } catch (error) {
    logger.error(`getCurrentUser: Invalid token - ${error.message}`);
    return { statusCode: 401, body: JSON.stringify({ message: "Invalid token" }) };
  }
}

// Get User by Email
async function getUserByEmail(db, email) {
  logger.info(`getUserByEmail: Fetching user - ${email}`);
  const usersCollection = db.collection("users");
  const user = await usersCollection.findOne({ email });
  logger.info(`getUserByEmail: ${user ? "Found" : "Not found"} - ${email}`);
  return user;
}

// Get Items in Cart
async function getItemsInCart(db, email) {
  logger.info(`getItemsInCart: START - ${email}`);
  const user = await getUserByEmail(db, email);
  const cart = user ? user.cart : [];
  logger.info(`getItemsInCart: END - ${cart.length} items`);
  return cart;
}

// Add Item to Cart
async function addItemToCart(db, email, productId) {
  logger.info(`addItemToCart: START - email: ${email}, productId: ${productId}`);

  const usersCollection = db.collection("users");
  const productsCollection = db.collection("products");
  const user = await getUserByEmail(db, email);

  if (!user) {
    logger.warn(`addItemToCart: User not found - ${email}`);
    throw new Error("User not found");
  }

  let product;
  try {
    product = await productsCollection.findOne({ _id: new ObjectId(productId) });
  } catch (error) {
    logger.error(`addItemToCart: Invalid productId format - ${productId}`);
    throw new Error("Invalid productId format");
  }

  if (!product) {
    logger.warn(`addItemToCart: Product not found - ${productId}`);
    throw new Error("Product not found");
  }

  logger.info(`addItemToCart: Adding product - ${product.name || productId}`);
  product.quantity = 1;
  user.cart.push(product);

  await usersCollection.updateOne({ email }, { $set: { cart: user.cart } });

  logger.info(`addItemToCart: END - Cart updated for ${email}`);
  return user.cart;
}

// Delete Item from Cart
async function deleteItemFromCart(db, email, productId) {
  logger.info(`deleteItemFromCart: START - email: ${email}, productId: ${productId}`);

  const usersCollection = db.collection("users");
  const user = await getUserByEmail(db, email);

  if (!user) {
    logger.warn(`deleteItemFromCart: User not found - ${email}`);
    throw new Error("User not found");
  }

  const productObjectId = new ObjectId(productId);
  const originalLength = user.cart.length;

  user.cart = user.cart.filter((item) => item._id.toString() !== productObjectId.toString());

  const result = await usersCollection.updateOne({ email }, { $set: { cart: user.cart } });

  const updatedLength = user.cart.length;
  if (result.modifiedCount === 0) {
    logger.info("deleteItemFromCart: No update made, item might not have existed.");
  } else {
    logger.info(`deleteItemFromCart: Removed item. Cart size: ${originalLength} → ${updatedLength}`);
  }

  return user.cart;
}

module.exports = {
  registerUser,
  loginUser,
  getUserByEmail,
  getItemsInCart,
  addItemToCart,
  deleteItemFromCart,
  getCurrentUser,
};
