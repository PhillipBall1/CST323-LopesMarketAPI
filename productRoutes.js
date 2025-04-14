const { ObjectId } = require("mongodb");
const logger = require("./logger");

// Get all products
async function getAllProducts(db) {
  logger.info("getAllProducts: START");
  const productsCollection = db.collection("products");

  const products = await productsCollection.find().toArray();
  logger.info(`getAllProducts: Retrieved ${products.length} products`);
  return products;
}

// Get product by ID
async function getProductById(db, productId) {
  logger.info(`getProductById: START - productId: ${productId}`);
  const productsCollection = db.collection("products");

  let product;
  try {
    product = await productsCollection.findOne({ _id: new ObjectId(productId) });
  } catch (error) {
    logger.error(`getProductById: Invalid productId format - ${productId}`);
    throw new Error("Invalid productId format");
  }

  if (!product) {
    logger.warn(`getProductById: Product not found - ${productId}`);
  } else {
    logger.info(`getProductById: SUCCESS - Found product ${product.name || productId}`);
  }

  return product;
}

// Add new product
async function addProduct(db, productData) {
  logger.info("addProduct: START");

  const productsCollection = db.collection("products");
  const { _id, ...dataToInsert } = productData;

  const result = await productsCollection.insertOne(dataToInsert);
  logger.info(`addProduct: SUCCESS - Product added with ID ${result.insertedId}`);

  return result.insertedId;
}

// Update product by ID
async function updateProduct(db, productId, updatedData) {
  logger.info(`updateProduct: START - productId: ${productId}`);
  const productsCollection = db.collection("products");

  const { _id, ...dataToUpdate } = updatedData;

  const result = await productsCollection.updateOne(
    { _id: new ObjectId(productId) },
    { $set: dataToUpdate }
  );

  if (result.modifiedCount > 0) {
    logger.info(`updateProduct: SUCCESS - Product updated: ${productId}`);
    return true;
  } else {
    logger.warn(`updateProduct: No changes made or product not found - ${productId}`);
    return false;
  }
}

// Delete product by ID
async function deleteProduct(db, productId) {
  logger.info(`deleteProduct: START - productId: ${productId}`);
  const productsCollection = db.collection("products");

  const result = await productsCollection.deleteOne({ _id: new ObjectId(productId) });

  if (result.deletedCount > 0) {
    logger.info(`deleteProduct: SUCCESS - Product deleted: ${productId}`);
    return true;
  } else {
    logger.warn(`deleteProduct: Product not found or already deleted - ${productId}`);
    return false;
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
};
