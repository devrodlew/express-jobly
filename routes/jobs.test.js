"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u4Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 100000,
    equity: 0.1,
    companyHandle: "c1",
  };

  test("ok for admins", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "new",
        salary: 100000,
        equity: "0.1",
        companyHandle: "c1",
      },
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        handle: "new",
        numEmployees: 10,
      })
      .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        ...newJob,
        salary: "not-an-integer",
      })
      .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: expect.any(Number),
          title: "J1",
          salary: 100000,
          equity: "0",
          companyHandle: "c1",
        },
        {
          id: expect.any(Number),
          title: "J2",
          salary: 200000,
          equity: "0.2",
          companyHandle: "c1",
        },
        {
          id: expect.any(Number),
          title: "J3",
          salary: 300000,
          equity: "0.3",
          companyHandle: "c2",
        },
      ],
    });
  });

  test("works for filters in query string", async function () {
    const resp = await request(app).get("/jobs").query({ minSalary: 200000 });
    expect(resp.body).toEqual({
      jobs: [
        {
          id: expect.any(Number),
          title: "J3",
          salary: 300000,
          equity: "0.3",
          companyHandle: "c2",
        },
        {
          id: expect.any(Number),
          title: "J2",
          salary: 200000,
          equity: "0.2",
          companyHandle: "c1",
        },
      ],
    });
  });

  test("throws error for bad query string", async function () {
    const resp = await request(app).get("/jobs?location=brookfield");
    expect(resp.statusCode).toEqual(400);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const testJob = await db.query(
      `SELECT id 
        FROM jobs 
        WHERE title = $1`,
      ["J3"]
    );

    const resp = await request(app).get(`/jobs/${testJob.rows[0].id}`);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "J3",
        salary: 300000,
        equity: "0.3",
        companyHandle: "c2",
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /jobs/:id", function () {
  test("works for admins", async function () {
    const testJob = await db.query(
      `SELECT id 
              FROM jobs 
              WHERE title = $1`,
      ["J3"]
    );
    const resp = await request(app)
      .patch(`/jobs/${testJob.rows[0].id}`)
      .send({
        title: "J3-new",
      })
      .set("authorization", `Bearer ${u4Token}`);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "J3-new",
        salary: 300000,
        equity: "0.3",
        companyHandle: "c2",
      },
    });
  });

  test("unauth for anon", async function () {
    const testJob = await db.query(
      `SELECT id 
              FROM jobs 
              WHERE title = $1`,
      ["J3"]
    );
    const resp = await request(app).patch(`/jobs/${testJob.rows[0].id}`).send({
      name: "J3-new",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/nope`)
      .send({
        title: "new nope",
      })
      .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on id change attempt", async function () {
    const testJob = await db.query(
      `SELECT id 
              FROM jobs 
              WHERE title = $1`,
      ["J3"]
    );
    const resp = await request(app)
      .patch(`/jobs/${testJob.rows[0].id}`)
      .send({
        id: 1,
      })
      .set("authorization", `Bearer ${u4Token}`);
    const testJob2 = await db.query(
      `SELECT id 
                  FROM jobs 
                  WHERE title = $1`,
      ["J3"]
    );

    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const testJob = await db.query(
      `SELECT id 
              FROM jobs 
              WHERE title = $1`,
      ["J3"]
    );
    const resp = await request(app)
      .patch(`/jobs/${testJob.rows[0].id}`)
      .send({
        salary: "not-an-integer",
      })
      .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admins", async function () {
    const testJob = await db.query(
      `SELECT id 
                    FROM jobs 
                    WHERE title = $1`,
      ["J3"]
    );
    const resp = await request(app)
      .delete(`/jobs/${testJob.rows[0].id}`)
      .set("authorization", `Bearer ${u4Token}`);
    expect(resp.body).toEqual({ deleted: expect.any(Number) });
  });

  test("unauth for anon", async function () {
    const testJob = await db.query(
      `SELECT id 
                    FROM jobs 
                    WHERE title = $1`,
      ["J3"]
    );
    const resp = await request(app).delete(`/jobs/${testJob.rows[0].id}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .delete(`/jobs/nope`)
      .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
