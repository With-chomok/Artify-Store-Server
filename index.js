const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const serviceAccount = require("./sdkKey.json");
const cors = require("cors");
const { log } = require("console");
const { decode } = require("punycode");
const app = express();
const port = process.env.PORT || 5000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(express.json());
app.use(cors());

// MongoDB connection string

const uri =
  "mongodb+srv://artify-db:BbSLdW5YgYrjHdwM@dipol-database-cluster.fbp5e4u.mongodb.net/?appName=DIPOL-DATABASE-CLUSTER";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const midlleware = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({
    message: "unauthorized access.Token not found!"
  })
}
  const token = authorization.split(" ")[1];
  
  try {
    await admin.auth().verifyIdToken(token);
    console.log(decode);
    next();
  } catch (error) {
    res.status(401).send({
      message: "unauthorized access",
    });
  }
};
// Declare collection variable outside so routes can use it

async function run() {
  try {
    await client.connect();
    const db = client.db("artworksCollection");
    artworksCollection = db.collection("artworks");
    favoritesCollection = db.collection("favorites");

    console.log(" MongoDB connected successfully!");
  } catch (err) {
    console.error(" MongoDB connection error:", err);
  }
}

run();

// Routes
app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

app.get("/artworks", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const artworks = await artworksCollection
      .find({ visibility: "Public" })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    res.send(artworks);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to fetch artworks" });
  }
});

app.get("/artworks-explore", async (req, res) => {
  const result = await artworksCollection
    .find({ visibility: "Public" })
    .toArray();
  res.send(result);
});

app.post("/artworks", async (req, res) => {
  try {
    const data = req.body;
    const result = await artworksCollection.insertOne(data);
    res.send({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to add artwork" });
  }
});

//  Get single artwork by ID
app.get("/artworks/:id", async (req, res) => {
  const id = req.params.id;
  const result = await artworksCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

//  Like Artwork
app.patch("/artworks/like/:id", async (req, res) => {
  const id = req.params.id;
  const result = await artworksCollection.updateOne(
    { _id: new ObjectId(id) },
    { $inc: { likes: 1 } }
  );
  res.send(result);
});

//  Add to Favorites
app.post("/favorites", async (req, res) => {
  const favorite = req.body;
  const exists = await favoritesCollection.findOne({
    userEmail: favorite.userEmail,
    artworkId: favorite.artworkId,
  });
  if (exists) {
    return res.status(409).send({ message: "Already added" });
  }
  const result = await favoritesCollection.insertOne(favorite);
  res.send(result);
});

//  Update artwork
app.put("/artworks/:id", async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const { ObjectId } = require("mongodb");

  const result = await artworksCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: data }
  );

  res.send(result);
});

//  Delete artwork
app.delete("/artworks/:id", async (req, res) => {
  const id = req.params.id;
  const { ObjectId } = require("mongodb");

  const result = await artworksCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

// Get favorites by user email
app.get("/favorites",midlleware, async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).send({ error: "Email is required" });
    }

    const result = await favoritesCollection
      .find({ userEmail: email })
      .toArray();

    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to fetch favorites" });
  }
});

app.delete("/favorites/:id", midlleware, async (req, res) => {
  const id = req.params.id;
  const result = await favoritesCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

// Start server
app.listen(port, () => {
  console.log(` Server is running on port ${port}`);
});
