const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const { ObjectId } = require('mongodb');

// Register User
async function registerUser(db, email, password) {
  const usersCollection = db.collection("users");

  // Check if the user already exists
  const existingUser = await usersCollection.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert the new user
  const result = await usersCollection.insertOne({
    email,
    password: hashedPassword,
    cart: [],
    mod: false,
  });
  return result.insertedId;
}

// Login User
async function loginUser(db, email, password) {
  const usersCollection = db.collection("users");

  // Find user by email
  const user = await usersCollection.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid password");
  }

  // Generate JWT token
  const token = jwt.sign({ email: user.email, mod: user.mod }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  return token;
}

// Gets active user
async function getCurrentUser(event, db) {
  const token = event.headers.Authorization || event.headers.authorization;
  
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ message: "No token provided" }) };
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email: decoded.email });

    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ message: "User not found" }) };
    }

    // Return user info
    return {
      statusCode: 200,
      body: JSON.stringify({
        email: user.email,
        mod: user.mod || false,
      }),
    };
  } catch (error) {
    return { statusCode: 401, body: JSON.stringify({ message: "Invalid token" }) };
  }
}

// Get User by Email
async function getUserByEmail(db, email) {
  const usersCollection = db.collection("users");
  return await usersCollection.findOne({ email });
}

// Get Items in Cart
async function getItemsInCart(db, email) {
  const user = await getUserByEmail(db, email);
  return user ? user.cart : [];
}

// Add Item to Cart
async function addItemToCart(db, email, productId) {
  const usersCollection = db.collection("users");
  const productsCollection = db.collection("products");
  const user = await getUserByEmail(db, email);

  if (!user) {
    throw new Error("User not found");
  }

  console.log("Received productId:", productId);

  let product;
  try {
    product = await productsCollection.findOne({ _id: new ObjectId(productId) });
  } catch (error) {
    console.error("Error converting productId:", error);
    throw new Error("Invalid productId format");
  }

  if (!product) {
    console.error("Product not found in database");
    throw new Error("Product not found");
  }

  console.log("Adding product to cart:", product);
  product.quantity = 1;
  user.cart.push(product);

  await usersCollection.updateOne({ email }, { $set: { cart: user.cart } });

  return user.cart;
}

// Get Items in Cart with Product Details
async function getItemsInCart(db, email) {
  const user = await getUserByEmail(db, email);
  return user ? user.cart : []; // Directly return cart if it's storing full products
}

async function deleteItemFromCart(db, email, productId) {
  const usersCollection = db.collection("users");
  const user = await getUserByEmail(db, email);

  if (!user) {
    throw new Error("User not found");
  }

  // Log the cart before attempting to remove the item
  console.log("User's cart before deletion:", user.cart);
  console.log("Product ID to delete:", productId);

  // Convert productId to ObjectId before filtering
  const productObjectId = new ObjectId(productId);

  // Remove item from cart by matching product _id
  user.cart = user.cart.filter((item) => {
    console.log("Checking item:", item._id); // Debugging line to see item ids
    return item._id.toString() !== productObjectId.toString(); // Compare ObjectIds as strings
  });

  // Log the updated cart after the deletion
  console.log("User's cart after deletion:", user.cart);

  // Proceed with the update
  const result = await usersCollection.updateOne({ email }, { $set: { cart: user.cart } });

  // Check if any user was matched or modified
  if (result.matchedCount === 0) {
    throw new Error("No matching user found to update");
  }

  if (result.modifiedCount === 0) {
    console.log("No updates were made to the cart. Cart may be unchanged.");
  } else {
    console.log("Cart updated successfully.");
  }

  return user.cart;
}




// Export all user functions
module.exports = {
  registerUser,
  loginUser,
  getUserByEmail,
  getItemsInCart,
  addItemToCart,
  deleteItemFromCart,
  getCurrentUser,
};
