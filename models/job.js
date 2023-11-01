"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * Throws BadRequestError if job already in database.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const duplicateCheck = await db.query(
      `SELECT title
           FROM jobs
           WHERE title = $1 AND company_handle = $2`,
      [title, companyHandle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job title: ${title}`);

    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ id, title, salary, equity, company_handle }, ...]
   * */

  static async findAll() {
    const jobsRes = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           ORDER BY company_handle`
    );
    return jobsRes.rows;
  }

  // filter for jobs based on title, salary or equity
  static async findAllFiltered({ title, minSalary, hasEquity }) {
    if (title && minSalary && hasEquity) {
      const jobsRes = await db.query(
        `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE LOWER(jobs.title) LIKE $1 AND salary >= $2 AND equity != $3
           ORDER BY salary DESC`,
        [`%${title}%`, minSalary, 0]
      );
      return jobsRes.rows;
    } else if (title && !minSalary && !hasEquity) {
      const jobsRes = await db.query(
        `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE LOWER(jobs.title) LIKE $1
           ORDER BY salary DESC`,
        [`%${title}%`]
      );
      return jobsRes.rows;
    } else if (title && minSalary && !hasEquity) {
      const jobsRes = await db.query(
        `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE LOWER(jobs.title) LIKE $1 AND salary >= $2
           ORDER BY salary DESC`,
        [`%${title}%`, minSalary]
      );
      return jobsRes.rows;
    } else if (title && !minSalary && hasEquity) {
      const jobsRes = await db.query(
        `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE LOWER(jobs.title) LIKE $1 AND equity != $2
           ORDER BY salary DESC`,
        [`%${title}%`, 0]
      );
      return jobsRes.rows;
    } else if (!title && minSalary && hasEquity) {
      const jobsRes = await db.query(
        `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE salary >= $1 AND equity != $2
           ORDER BY salary DESC`,
        [minSalary, 0]
      );
      return jobsRes.rows;
    } else if (!title && minSalary && !hasEquity) {
      const jobsRes = await db.query(
        `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE salary >= $1
           ORDER BY salary DESC`,
        [minSalary]
      );
      return jobsRes.rows;
    } else if (!title && !minSalary && hasEquity) {
      const jobsRes = await db.query(
        `SELECT id,
                title,
                salary,
                equity,
                company_handle AS "companyHandle"
          FROM jobs
          WHERE equity != $1
          ORDER BY salary DESC`,
        [0]
      );
      return jobsRes.rows;
    }
  }

  /** Given a job ID return data about the job.
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    if (isNaN(id)) {
      throw new NotFoundError(`Invalid Job ID: ${id}`);
    }
    const jobRes = await db.query(
      `SELECT id,
                title,
                salary,
                equity,
                company_handle AS "companyHandle"
          FROM jobs
          WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`Invalid Job ID: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, company_handle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    if (isNaN(id)) {
      throw new NotFoundError(`Invalid Job ID: ${id}`);
    }
    const { setCols, values } = sqlForPartialUpdate(data, {
      title: "title",
      salary: "salary",
      equity: "equity",
    });
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`Invalid Job ID: ${id}`);

    return job;
  }

  static async remove(id) {
    if (isNaN(id)) {
      throw new NotFoundError(`Invalid Job ID: ${id}`);
    }
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]
    );
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job with ID: ${id}`);
    return job;
  }
}

module.exports = Job;
