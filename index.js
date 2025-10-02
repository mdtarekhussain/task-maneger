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
    const commentsCollection = client.db("Taks_Manager").collection("comments");

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

        res.send({ message: "টাস্ক সফলভাবে আপডেট হয়েছে !", result });
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
        return res.status(404).send({ message: "টাস্ক পাওয়া যায়নি!" });
      }

      const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Get tasks by email
    app.get("/task", async (req, res) => {
      try {
        const tasks = await tasksCollection.find().toArray();
        res.send(tasks);
      } catch (error) {
        res.status(500).send({ message: "Server Error", error });
      }
    });

    // ===== COMMENTS ENDPOINTS =====

    // POST: add a new comment
    app.post("/comments", async (req, res) => {
      try {
        const comment = req.body;
        
        // Validate required fields
        if (!comment.taskId || !comment.text || !comment.email) {
          return res.status(400).send({ message: "Missing required fields: taskId, text, email" });
        }

        // Get user information
        const user = await userCollection.findOne({ email: comment.email });
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        // Verify the task exists
        const task = await tasksCollection.findOne({ _id: new ObjectId(comment.taskId) });
        if (!task) {
          return res.status(404).send({ message: "Task not found" });
        }

        // Create new comment object
        const newComment = {
          taskId: comment.taskId,
          text: comment.text,
          email: comment.email,
          name: user.name,
          photo: user.photo,
          createdAt: new Date(),
        };

        const result = await commentsCollection.insertOne(newComment);
        res.send({
          message: "Comment added successfully",
          insertedId: result.insertedId,
          comment: newComment
        });
      } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).send({ message: "Internal server error", error });
      }
    });

    // GET: get all comments or comments for a specific task
    app.get("/comments", async (req, res) => {
      try {
        const { taskId } = req.query;
        
        let comments;
        
        if (taskId) {
          // Get comments for a specific task
          comments = await commentsCollection
            .find({ taskId: taskId })
            .sort({ createdAt: -1 }) // Sort by newest first
            .toArray();
        } else {
          // Get all comments
          comments = await commentsCollection
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
        }
        
        res.send(comments);
      } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).send({ message: "Server Error", error });
      }
    });

    // DELETE: delete a comment by ID
    app.delete("/comments/:id", async (req, res) => {
      try {
        const { id } = req.params;
        
        // First, check if the comment exists
        const comment = await commentsCollection.findOne({ _id: new ObjectId(id) });
        if (!comment) {
          return res.status(404).send({ message: "Comment not found" });
        }

        // Delete the comment
        const result = await commentsCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Comment not found" });
        }

        res.send({ message: "Comment deleted successfully", result });
      } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).send({ message: "Internal server error", error });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error(error);
  } finally {
    // MongoClient stays open for server lifetime
    // If you need to close in special cases, use: await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });
module.exports = app;
// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });