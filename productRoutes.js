const { ObjectId } = require('mongodb');

// Get all products
async function getAllProducts(db) {
  const productsCollection = db.collection("products");
  return await productsCollection.find().toArray();
}

// Get product by ID
async function getProductById(db, productId) {
  const productsCollection = db.collection("products");
  // Convert productId to ObjectId
  return await productsCollection.findOne({ _id: new ObjectId(productId) });
}

// Add new product
async function addProduct(db, productData) {
  const productsCollection = db.collection("products");

  // Make sure _id is not included in the productData when adding
  const { _id, ...dataToInsert } = productData;

  const result = await productsCollection.insertOne(dataToInsert);
  return result.insertedId;
}

// Update product by ID
async function updateProduct(db, productId, updatedData) {
  const productsCollection = db.collection("products");

  // Remove _id from updatedData to avoid modifying the immutable _id field
  const { _id, ...dataToUpdate } = updatedData;

  const result = await productsCollection.updateOne(
    { _id: new ObjectId(productId) }, 
    { $set: dataToUpdate } // Use dataToUpdate without the _id
  );
  return result.modifiedCount > 0;
}

// Delete product by ID
async function deleteProduct(db, productId) {
  const productsCollection = db.collection("products");

  // Convert productId to ObjectId
  const result = await productsCollection.deleteOne({ _id: new ObjectId(productId) });
  return result.deletedCount > 0;
}

// Export all product functions
module.exports = {
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
};
