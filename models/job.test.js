const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "new",
    salary: 100000,
    equity: "0",
    companyHandle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    const { title, salary, equity, companyHandle } = job;
    expect({ title, salary, equity, companyHandle }).toEqual(newJob);

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'new'`
    );
    expect(result.rows[0]).toEqual({
      title: "new",
      salary: 100000,
      equity: "0",
      companyHandle: "c1",
    });
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        title: "J1",
        id: expect.any(Number),
        salary: 100000,
        equity: "0",
        companyHandle: "c1",
      },
      {
        title: "J2",
        id: expect.any(Number),
        salary: 200000,
        equity: "0.2",
        companyHandle: "c1",
      },
      {
        title: "J3",
        id: expect.any(Number),
        salary: 300000,
        equity: "0.3",
        companyHandle: "c2",
      },
    ]);
  });
});

/************************************** findAllFiltered */
describe("findAllFiltered", function () {
  test("works: title filter", async function () {
    let jobs = await Job.findAllFiltered({ title: "1" });
    expect(jobs).toEqual([
      {
        title: "J1",
        id: expect.any(Number),
        salary: 100000,
        equity: "0",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: minSalary filter", async function () {
    let jobs = await Job.findAllFiltered({ minSalary: 200000 });
    expect(jobs).toEqual([
      {
        title: "J3",
        id: expect.any(Number),
        salary: 300000,
        equity: "0.3",
        companyHandle: "c2",
      },
      {
        title: "J2",
        id: expect.any(Number),
        salary: 200000,
        equity: "0.2",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: hasEquity filter", async function () {
    let jobs = await Job.findAllFiltered({ hasEquity: "yes" });
    expect(jobs).toEqual([
      {
        title: "J3",
        id: expect.any(Number),
        salary: 300000,
        equity: "0.3",
        companyHandle: "c2",
      },
      {
        title: "J2",
        id: expect.any(Number),
        salary: 200000,
        equity: "0.2",
        companyHandle: "c1",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const testJob = await db.query(
      `SELECT id 
          FROM jobs 
          WHERE title = $1`,
      ["J3"]
    );
    let job = await Job.get(testJob.rows[0].id);
    expect(job).toEqual({
      title: "J3",
      id: expect.any(Number),
      salary: 300000,
      equity: "0.3",
      companyHandle: "c2",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "New",
    salary: 150000,
    equity: 0.9,
  };

  test("works", async function () {
    const testJob = await db.query(
      `SELECT id 
            FROM jobs 
            WHERE title = $1`,
      ["J3"]
    );
    let job = await Job.update(testJob.rows[0].id, updateData);
    expect(job).toEqual({
      id: expect.any(Number),
      companyHandle: "c2",
      title: "New",
      salary: 150000,
      equity: "0.9",
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
             FROM jobs
             WHERE id = $1`,
      [testJob.rows[0].id]
    );
    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
        title: "New",
        salary: 150000,
        equity: "0.9",
        companyHandle: "c2",
      },
    ]);
  });

  test("works: null fields", async function () {
    const testJob = await db.query(
      `SELECT id 
            FROM jobs 
            WHERE title = $1`,
      ["J3"]
    );
    const updateDataSetNulls = {
      title: "New",
      salary: null,
      equity: null,
    };

    let job = await Job.update(testJob.rows[0].id, updateDataSetNulls);
    expect(job).toEqual({
      id: expect.any(Number),
      companyHandle: "c2",
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs
        WHERE id = $1`,
      [testJob.rows[0].id]
    );
    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
        title: "New",
        salary: null,
        equity: null,
        companyHandle: "c2",
      },
    ]);
  });

  test("not found if no such company", async function () {
    try {
      await Job.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    const testJob = await db.query(
      `SELECT id 
            FROM jobs 
            WHERE title = $1`,
      ["J3"]
    );
    try {
      await Job.update(testJob.rows[0].id, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    const testJob = await db.query(
      `SELECT id 
                  FROM jobs 
                  WHERE title = $1`,
      ["J3"]
    );
    await Job.remove(testJob.rows[0].id);
    const res = await db.query(`SELECT id FROM jobs WHERE id = $1`, [
      testJob.rows[0].id,
    ]);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
