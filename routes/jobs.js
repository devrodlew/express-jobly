"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError, ExpressError } = require("../expressError");
const { ensureLoggedIn, ensureAdminUser } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();

/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle}
 *
 * Authorization required: admin
 */

router.post("/", ensureAdminUser, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { jobs: [ { id, title, salary, equity, companyHandle }, ...] }
 *
 * Can filter on provided search filters:
 * - title
 * - minSalary
 * - hasEquity (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    const allowedFields = ["title", "minSalary", "hasEquity"];
    const filterFields = Object.keys(req.query);
    if (filterFields.length == 0) {
      const jobs = await Job.findAll();
      return res.json({ jobs });
    } else if (filterFields.length > 0) {
      for (let value of filterFields) {
        if (!allowedFields.includes(value)) {
          throw new ExpressError(
            "You may only filter on title, salary and equity",
            400
          );
        }
      }
      const jobs = await Job.findAllFiltered(req.query);
      return res.json({ jobs });
    }
  } catch (err) {
    return next(err);
  }
});

/** GET /[id]  =>  { job }
 *
 *  Job is { id, title, salary, equity, companyHandle }
 *
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.id);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: login
 */

router.patch("/:id", ensureAdminUser, async function (req, res, next) {
  try {
    const allowedFields = ["title", "salary", "equity"];
    const updateFields = Object.keys(req.body);
    for (let value of updateFields) {
      if (!allowedFields.includes(value)) {
        throw new ExpressError(
          "You may only update the title, salary or equity",
          400
        );
      }
    }

    const validator = jsonschema.validate(req.body, jobUpdateSchema);

    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[id]  =>  { deleted: id}
 *
 * Authorization: login
 */

router.delete("/:id", ensureAdminUser, async function (req, res, next) {
  try {
    const remJob = await Job.remove(req.params.id);
    return res.json({ deleted: remJob.id });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
