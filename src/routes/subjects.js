const router = require("express").Router();
let Subject = require("../models/subject.model");

// Get all subjects
router.route("/").get((req, res) => {
  Subject.find()
    .then((subjects) => res.json(subjects))
    .catch((err) => res.status(400).json("Error: " + err));
});

// Add a new subject
router.route("/add").post((req, res) => {
  const name = req.body.name;
  const credits = Number(req.body.credits);

  const newSubject = new Subject({ name, credits });

  newSubject
    .save()
    .then(() => res.json("Subject added!"))
    .catch((err) => res.status(400).json("Error: " + err));
});

module.exports = router;
