const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.post("/signup", (req, res) => {
  const {
    name,
    surname,
    schoolCardId,
    email,
    password,
    acceptedTerms,
    acceptedPrivacy,
  } = req.body;

  // Here you would typically save the user data to a database
  // For now, we'll just log it and send a success response
  console.log("User data:", req.body);

  res.status(201).json({ message: "User signed up successfully" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
