const { connectToDatabase } = require("./db");

const {
  registerUser,
  loginUser,
  getUserByEmail,
  getItemsInCart,
  addItemToCart,
  deleteItemFromCart,
  getCurrentUser,
} = require("./userRoutes");

const {
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
} = require("./productRoutes");

// CORS Headers for all responses
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path;
  const db = await connectToDatabase();

  try {
    // Request Logging
    console.log("Incoming request:", { method, path, body: event.body }); 

    // User Registration (POST /register)
    if (method === "POST" && path.includes("/register")) {
      const { email, password } = JSON.parse(event.body);
      await registerUser(db, email, password);
      return { statusCode: 201, body: JSON.stringify({ message: "User registered successfully" }), headers };
    }

    // User Login (POST /login)
    if (method === "POST" && path.includes("/login")) {
      const { email, password } = JSON.parse(event.body);
      const token = await loginUser(db, email, password);
      return { statusCode: 200, body: JSON.stringify({ message: "Login successful", token }), headers };
    }

    if (method === 'GET' && path === '/current-user') {
      const userInfo = await getCurrentUser(event, db);
      return {
        statusCode: userInfo.statusCode,
        body: userInfo.body,
        headers: headers
      };
    }

    // Get User by Email (GET /users/{email})
    if (method === "GET" && path.startsWith("/users/")) {
      const email = path.split("/")[2];
      const user = await getUserByEmail(db, email);
      return { statusCode: 200, body: JSON.stringify(user), headers };
    }

    // Get Items in Cart (GET /users/{email}/cart)
    if (method === "GET" && path.startsWith("/users/") && path.includes("/cart")) {
      const email = path.split("/")[2];
      const cart = await getItemsInCart(db, email);
      return { statusCode: 200, body: JSON.stringify({ cart }), headers };
    }

    // Add Item to Cart (PUT /users/{email}/cart)
    if (method === "PUT" && path.startsWith("/users/") && path.includes("/cart")) {
      const email = path.split("/")[2];
      const { productId } = JSON.parse(event.body);
      const updatedCart = await addItemToCart(db, email, productId);
      return { statusCode: 200, body: JSON.stringify({ cart: updatedCart }), headers };
    }

    // Delete Item from Cart (DELETE /users/{email}/cart/{id})
    if (method === "DELETE" && path.startsWith("/users/") && path.includes("/cart/")) {
      const email = path.split("/")[2];
      const productId = path.split("/")[4];
      const updatedCart = await deleteItemFromCart(db, email, productId);
      return { statusCode: 200, body: JSON.stringify({ cart: updatedCart }), headers };
    }

    // Get All Products (GET /products)
    if (method === "GET" && path === "/products") {
      const products = await getAllProducts(db);
      return { statusCode: 200, body: JSON.stringify({ products }), headers };
    }

    // Get Product by ID (GET /products/{id})
    if (method === "GET" && path.startsWith("/products/")) {
      const productId = path.split("/")[2];
      const product = await getProductById(db, productId);
      return product ? 
        { statusCode: 200, body: JSON.stringify({ product }), headers } :
        { statusCode: 404, body: JSON.stringify({ message: "Product not found" }), headers };
    }

    // Add Product (POST /products)
    if (method === "POST" && path === "/products") {
      const productData = JSON.parse(event.body);
      const insertedId = await addProduct(db, productData);
      return { statusCode: 201, body: JSON.stringify({ message: "Product added successfully", id: insertedId }), headers };
    }

    // Update Product by ID (PUT /products/{id})
    if (method === "PUT" && path.startsWith("/products/")) {
      const productId = path.split("/")[2];
      const updatedData = JSON.parse(event.body);
      const updated = await updateProduct(db, productId, updatedData);
      return updated ? 
        { statusCode: 200, body: JSON.stringify({ message: "Product updated successfully" }), headers } :
        { statusCode: 404, body: JSON.stringify({ message: "Product not found" }), headers };
    }

    // Delete Product by ID (DELETE /products/{id})
    if (method === "DELETE" && path.startsWith("/products/")) {
      const productId = path.split("/")[2];
      const deleted = await deleteProduct(db, productId);
      return deleted ? 
        { statusCode: 200, body: JSON.stringify({ message: "Product deleted successfully" }), headers } :
        { statusCode: 404, body: JSON.stringify({ message: "Product not found" }), headers };
    }

    return { statusCode: 404, body: JSON.stringify({ message: "Not found" }), headers };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message }), headers };
  }
};