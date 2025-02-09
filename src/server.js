const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto"); // Ensure crypto is correctly imported
const nodemailer = require("nodemailer");
const app = express();
const port = process.env.PORT || 5001;
require("dotenv").config(); // Load environment variables from .env file

app.use(cors());
app.use(express.json());

// Create a connection to the MySQL database
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Password",
  database: "schedules",
  port: 3306,
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the MySQL database");
});

// Define a simple route
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Fetch all subjects
app.get("/api/subjects", (req, res) => {
  const query = "SELECT * FROM subject";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching subjects:", err);
      res.status(500).send("Error fetching subjects");
      return;
    }
    res.json(results);
  });
});

// Fetch schedule for a student
app.get("/api/schedule", (req, res) => {
  const studentId = req.query.studentId;
  const query = `
    SELECT s.name AS subjectName, s.abbreviation, s.professor, s.lectureRoom, sc.day, sc.startTime, sc.endTime
    FROM schedule sc
    JOIN subject s ON sc.subjectId = s.subjectID
    WHERE sc.studentId = ?
  `;
  db.query(query, [studentId], (err, results) => {
    if (err) {
      console.error("Error fetching schedule:", err);
      res.status(500).send("Error fetching schedule");
      return;
    }
    res.json(results);
  });
});

// Add or update subjects
app.post("/api/subjects", (req, res) => {
  const {
    subjectID,
    name,
    abbreviation,
    credit_points,
    inside_module,
    moduleID,
    optional,
    semester,
    hours,
    school_year,
  } = req.body;
  const query = subjectID
    ? "UPDATE subject SET name = ?, abbreviation = ?, credit_points = ?, inside_module = ?, moduleID = ?, optional = ?, semester = ?, hours = ?, school_year = ? WHERE subjectID = ?"
    : "INSERT INTO subject (name, abbreviation, credit_points, inside_module, moduleID, optional, semester, hours, school_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const params = subjectID
    ? [
        name,
        abbreviation,
        credit_points,
        inside_module,
        moduleID,
        optional,
        semester,
        hours,
        school_year,
        subjectID,
      ]
    : [
        name,
        abbreviation,
        credit_points,
        inside_module,
        moduleID,
        optional,
        semester,
        hours,
        school_year,
      ];
  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Error adding/updating subject:", err);
      res.status(500).send("Error adding/updating subject");
      return;
    }
    res.json(results);
  });
});

// Add or update schedule
app.post("/api/schedule", (req, res) => {
  const { id, subjectId, day, startTime, endTime } = req.body;
  const query = id
    ? "UPDATE schedule SET subjectId = ?, day = ?, startTime = ?, endTime = ? WHERE id = ?"
    : "INSERT INTO schedule (subjectId, day, startTime, endTime) VALUES (?, ?, ?, ?)";
  const params = id
    ? [subjectId, day, startTime, endTime, id]
    : [subjectId, day, startTime, endTime];
  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Error adding/updating schedule:", err);
      res.status(500).send("Error adding/updating schedule");
      return;
    }
    res.json(results);
  });
});

// Check if studentID is valid
app.post("/validateID", (req, res) => {
  const { studentID } = req.body;
  console.log("Validating studentID:", studentID); // Log the studentID
  const checkValidQuery = "SELECT * FROM students WHERE studentID = ?";

  db.query(checkValidQuery, [studentID], (err, validResults) => {
    if (err) {
      console.error("Error checking valid studentID:", err);
      res.status(500).send("Error checking valid studentID");
      return;
    }

    if (validResults.length === 0) {
      res.status(400).send("Invalid studentID");
      return;
    }

    res.send("StudentID is valid");
  });
});
// Change Password Endpoint
app.post("/changePassword", (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  console.log("Changing password for user with email:", email); // Log the email

  const query = "SELECT * FROM students WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      res.status(500).send("Error fetching user");
      return;
    }

    if (results.length === 0) {
      res.status(400).send("Invalid email");
      return;
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    console.log("isPasswordValid", isPasswordValid);

    if (!isPasswordValid) {
      res.status(400).send("Invalid old password");
      return;
    }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateQuery = "UPDATE students SET password = ? WHERE email = ?";
      db.query(updateQuery, [hashedPassword, email], (err, updateResults) => {
        if (err) {
          console.error("Error updating password:", err);
          res.status(500).send("Error updating password");
          return;
        }
        res.json({ message: "Password changed successfully" });
      });
    } catch (error) {
      console.error("Error hashing new password:", error);
      res.status(500).send("Error changing password");
    }
  });
});
// Check if studentID is valid and not already in use
app.post("/checkID", (req, res) => {
  const { studentID } = req.body;
  console.log("here is the request", studentID); // Log the studentID
  const checkInUseQuery = "SELECT * FROM students WHERE studentID = ?";

  db.query(checkInUseQuery, [studentID], (err, inUseResults) => {
    if (err) {
      console.error("Error checking studentID in use:", err);
      res.status(500).send("Error checking studentID in use");
      return;
    }

    if (inUseResults.length > 0) {
      res.status(400).send("StudentID already in use");
      return;
    }

    res.send("StudentID is free");
  });
});

// User registration endpoint
app.post("/signup", async (req, res) => {
  const { studentID, name, surname, email, password } = req.body;
  console.log("here is the request", req.body); // Log the request body
  try {
    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password:", password); // Log the plain password
    console.log("Hashed Password:", hashedPassword); // Log the hashed password

    const query =
      "INSERT INTO students (studentID, name, surname, email, password) VALUES (?, ?, ?, ?, ?)";
    const params = [studentID, name, surname, email, hashedPassword];
    db.query(query, params, (err, results) => {
      if (err) {
        console.error("Error registering user:", err);
        res.status(500).send("Error registering user");
        return;
      }
      res.json({ message: "User registered successfully", results });
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).send("Error registering user");
  }
});

// User login endpoint
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  console.log("Logging in user with email:", email); // Log the email

  const query = "SELECT * FROM students WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      res.status(500).send("Error fetching user");
      return;
    }

    if (results.length === 0) {
      console.log("here1");
      res.status(400).send("Invalid email or password");
      return;
    }

    const user = results[0];
    console.log("password", password);
    console.log("user.password", user.password);
    if (!user.verifiedMail) {
      console.log("User not verified");
      res
        .status(400)
        .send(
          "User not verified. Please check your email for verification instructions."
        );
      return;
    }
    // Log the types of password and user.password
    console.log("Type of password:", typeof password);
    console.log("Type of user.password:", typeof user.password);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("isPasswordValid", isPasswordValid);

    if (!isPasswordValid) {
      res.status(400).send("Invalid email or password");
      return;
    }

    // res.send("Login successful");
    res.json({
      user,
    });
  });
});
// Send verification email
app.post("/sendVerificationEmail", (req, res) => {
  const { email } = req.body;
  const token = crypto.randomBytes(20).toString("hex");

  console.log("Sending verification email to:", email); // Log the email
  console.log("Generated token:", token); // Log the token
  console.log("here2");

  const query = "UPDATE students SET verificationToken = ? WHERE email = ?";
  db.query(query, [token, email], (err, results) => {
    if (err) {
      console.error("Error setting verification token:", err);
      res.status(500).send("Error setting verification token");
      return;
    }

    const transporter = nodemailer.createTransport({
      //service: "Gmail",
      host: process.env.HOST,
      post: process.env.PORT,
      secure: process.env.SECURE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    transporter
      .sendMail({
        from: "kogojmihadrive@gmail.com",
        to: email,
        subject: "Account Verification",
        text: `Please verify your account by clicking the following link: http://localhost:5001/verify/${token}`,
      })
      .then(() => {
        res.json({ message: "Verification email sent" });
      })
      .catch((err) => {
        console.error("Error sending verification email:", err);
        res.status(500).send("Error sending verification email");
      });
    // const mailOptions = {
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: "Account Verification",
    //   text: `Please verify your account by clicking the following link: http://localhost:5001/verify/${token}`,
    // };

    // transporter.sendMail(mailOptions, (err, response) => {
    //   if (err) {
    //     console.error("Error sending verification email:", err);
    //     res.status(500).send("Error sending verification email");
    //     return;
    //   }
    //   res.json({ message: "Verification email sent" });
    // });
  });
});

// Verify email endpoint
app.get("/verify/:token", (req, res) => {
  const { token } = req.params;

  const query =
    "UPDATE students SET verifiedMail = true WHERE verificationToken = ?";
  db.query(query, [token], (err, results) => {
    if (err) {
      console.error("Error verifying email:", err);
      res.status(500).send("Error verifying email");
      return;
    }

    res.send("Email verified successfully");
  });
});
// Update user email
app.put("/users/me/email", (req, res) => {
  const { email } = req.body;
  const userId = req.user.id; // Assuming you have user ID in req.user

  const query = "UPDATE students SET email = ? WHERE studentID = ?";
  db.query(query, [email, userId], (err, results) => {
    if (err) {
      console.error("Error updating email:", err);
      res.status(500).send("Error updating email");
      return;
    }
    res.json({ message: "Email updated successfully" });
  });
});

// Update user password
app.put("/users/me/password", async (req, res) => {
  const { password } = req.body;
  const userId = req.user.id; // Assuming you have user ID in req.user

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = "UPDATE students SET password = ? WHERE studentID = ?";
    db.query(query, [hashedPassword, userId], (err, results) => {
      if (err) {
        console.error("Error updating password:", err);
        res.status(500).send("Error updating password");
        return;
      }
      res.json({ message: "Password updated successfully" });
    });
  } catch (error) {
    console.error("Error hashing password:", error);
    res.status(500).send("Error updating password");
  }
});
app.post("/users/send-token", (req, res) => {
  const { email } = req.body;
  const token = crypto.randomBytes(20).toString("hex");

  console.log("Sending verification token to:", email); // Log the email
  console.log("Generated token:", token); // Log the token
  console.log("herehere3", query);

  // const query = "UPDATE students SET verificationToken = ? WHERE email = ?";
  console.log("herehere3", query);
  db.query(query, [token, email], (err, results) => {
    if (err) {
      console.error("Error setting verification token:", err);
      res.status(500).send("Error setting verification token");
      return;
    }
    console.log("Verification token set in database for:", email);

    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: process.env.SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      debug: true, // Enable debug output
      logger: true, // Log information to console
    });

    const mailOptions = {
      from: "kogojmihadrive@gmail.com",
      to: "kogojmiha@gmail.com",
      subject: "Password Reset Verification",
      text: `Please use the following token to reset your password: ${token}`,
    };
    transporter.sendMail(mailOptions, (err, response) => {
      if (err) {
        console.error("Error sending verification token:", err);
        res.status(500).send("Error sending verification token");
        return;
      }
      console.log("Verification token sent:", response); // Log the response
      res.json({ message: "Verification token sent" });
    });
  });
});

app.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const query = "SELECT * FROM students WHERE verificationToken = ?";
  db.query(query, [token], async (err, results) => {
    if (err) {
      console.error("Error verifying token:", err);
      res.status(500).send("Error verifying token");
      return;
    }

    if (results.length === 0) {
      res.status(400).send("Invalid token");
      return;
    }

    const user = results[0];
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateQuery =
        "UPDATE students SET password = ?, verificationToken = NULL WHERE email = ?";
      db.query(
        updateQuery,
        [hashedPassword, user.email],
        (err, updateResults) => {
          if (err) {
            console.error("Error resetting password:", err);
            res.status(500).send("Error resetting password");
            return;
          }
          res.json({ message: "Password reset successfully" });
        }
      );
    } catch (error) {
      console.error("Error hashing password:", error);
      res.status(500).send("Error resetting password");
    }
  });
});
app.post("/forgotPassword", (req, res) => {
  const { email } = req.body;
  const token = crypto.randomBytes(20).toString("hex");

  console.log("Sending password reset token to:", email); // Log the email
  console.log("Generated token:", token); // Log the token

  const query = "UPDATE students SET verificationToken = ? WHERE email = ?";
  db.query(query, [token, email], (err, results) => {
    if (err) {
      console.error("Error setting verification token:", err);
      res.status(500).send("Error setting verification token");
      return;
    }
    console.log("Verification token set in database for:", email);

    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: process.env.SECURE === "true", // Convert string to boolean
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      debug: true, // Enable debug output
      logger: true, // Log information to console
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      text: `Please use the following link to reset your password: http://localhost:3000/reset-password/${token}`,
    };

    transporter.sendMail(mailOptions, (err, response) => {
      if (err) {
        console.error("Error sending password reset email:", err);
        res.status(500).send("Error sending password reset email");
        return;
      }
      console.log("Password reset email sent:", response); // Log the response
      res.json({ message: "Password reset email sent" });
    });
  });
});
// Submit selected subjects
app.post("/api/submitSubjects", (req, res) => {
  const { selectedSubjects } = req.body;
  const userId = req.user.id; // Assuming you have user ID in req.user

  const query = "INSERT INTO user_subjects (userId, subjectId) VALUES ?";
  const values = selectedSubjects.map((subjectId) => [userId, subjectId]);

  db.query(query, [values], (err, results) => {
    if (err) {
      console.error("Error submitting subjects:", err);
      res.status(500).send("Error submitting subjects");
      return;
    }
    res.json({ message: "Subjects submitted successfully" });
  });
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
