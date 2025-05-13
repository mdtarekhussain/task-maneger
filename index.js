const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.vcokv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const userCollection = client.db("Taks_Manager").collection("users");
    const tasksCollection = client.db("Taks_Manager").collection("tasks");

    // POST: add user
    app.post("/user", async (req, res) => {
      const user = req.body;

      // Check if user already exists by email
      const existingUser = await userCollection.findOne({ email: user.email });

      if (existingUser) {
        return res.send({ message: "User already exists", inserted: false });
      }

      // If not exists, insert new user
      const result = await userCollection.insertOne(user);
      res.send({
        message: "User inserted",
        inserted: true,
        insertedId: result.insertedId,
      });
    });

    // GET: get all users
    app.get("/users", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // POST: add task
    app.post("/task", async (req, res) => {
      const task = req.body;
      const userEmail = task.email;
      const user = await userCollection.findOne({ email: userEmail });

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      // Save task with name & photo
      const result = await tasksCollection.insertOne({
        ...task,
        createdAt: new Date(),
      });

      res.send(result);
    });

    // Update Task
    app.put("/task/:id", async (req, res) => {
      const { id } = req.params;
      const { text } = req.body;

      if (!text) {
        return res.status(400).send({ message: "টেক্সট দেওয়া হয়নি।" });
      }

      try {
        const query = { _id: new ObjectId(id) };
        const updatedDoc = { $set: { text: text } };

        const result = await tasksCollection.updateOne(query, updatedDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "টাস্ক পাওয়া যায়নি।" });
        }

        res.send({ message: "টাস্ক সফলভাবে আপডেট হয়েছে", result });
      } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).send({ message: "Internal server error", error });
      }
    });

    // Delete Task
    app.delete("/task/:id", async (req, res) => {
      const { id } = req.params;
      const task = await tasksCollection.findOne({ _id: new ObjectId(id) });

      if (!task) {
        return res.status(404).send({ message: "টাস্ক পাওয়া যায়নি" });
      }

      const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Get tasks by email
    // Get tasks by email
    app.get("/task", async (req, res) => {
      const tasks = await tasksCollection.find().toArray();
      res.send(tasks);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error(error);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
