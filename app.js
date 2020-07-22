const express = require("express");
const path = require("path");
const logger = require("morgan");
const bodyParser = require("body-parser");
const asyncRedis = require("async-redis");

const app = express();

// Create async client.
const client = asyncRedis.createClient();

// Handle connections to the client.
client.on("connect", () => {
  console.log("Redis server connected...");
});

// View engine set up.
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Set up logging.
app.use(logger("dev"));

// Add form processing.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Handle static files.
app.use(express.static(path.join(__dirname, "public")));

// Load task list and call hash from Redis in the default route.
app.get("/", async (req, res) => {
  const tasks = await client.lrange("tasks", 0, -1);
  const call = await client.hgetall("call");

  res.render("index", {
    tasks,
    call,
  });
});

// Add a task to the Redis data store task list.
app.post("/task/add", async (req, res) => {
  const task = req.body.task;

  await client.rpush("tasks", task);
  res.redirect("/");
});

// Delete a task from Redis data store task list.
app.post("/task/delete", async (req, res) => {
  const tasksToDel = req.body.tasks;

  const tasks = await client.lrange("tasks", 0, -1);
  await Promise.all([
    tasks
      .filter((task) => tasksToDel.includes(task))
      .map((delTask) => client.lrem("tasks", 0, delTask)),
  ]);

  res.redirect("/");
});

// Add a call to the Redis call hash.
app.post("/call/add", async (req, res) => {
  const newCall = { ...req.body };

  await client.hmset("call", [
    "name",
    newCall.name,
    "company",
    newCall.company,
    "phone",
    newCall.phone,
    "time",
    newCall.time,
  ]);
  res.redirect("/");
});

app.listen(3000);
console.log("Server started on port 3000...");

module.exports = app;
