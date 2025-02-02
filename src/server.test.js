const request = require("supertest");
const express = require("express");
const mysql = require("mysql2");
const app = require("./server"); // Assuming your server.js exports the app

// src/server.test.js

describe("Server API Endpoints", () => {
  let db;

  beforeAll(() => {
    db = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Password",
      database: "rapla",
      port: 3306,
    });

    db.connect((err) => {
      if (err) {
        console.error("Error connecting to the database:", err);
      } else {
        console.log("Connected to the MySQL database");
      }
    });
  });

  afterAll(() => {
    db.end();
  });

  it("should connect to the database", (done) => {
    db.ping((err) => {
      expect(err).toBeNull();
      done();
    });
  });

  it("should return Hello World on GET /", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual("Hello World!");
  });

  it("should fetch all subjects on GET /api/subjects", async () => {
    const res = await request(app).get("/api/subjects");
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  it("should fetch schedule for a student on GET /api/schedule", async () => {
    const res = await request(app)
      .get("/api/schedule")
      .query({ studentId: "S101" });
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  it("should check if studentID is valid and not already in use on POST /checkID", async () => {
    const res = await request(app).post("/checkID").send({ studentID: "S101" });
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual("StudentID is valid and not in use");
  });

  it("should register a user on POST /signup", async () => {
    const res = await request(app).post("/signup").send({
      studentID: "S102",
      name: "John",
      surname: "Doe",
      email: "john.doe@example.com",
      password: "Password123!",
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual("User registered successfully");
  });
});
