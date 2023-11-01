const { sqlForPartialUpdate } = require("./sql");

describe("convert JSON into usable format for sql update", function () {
  test("recieve JSON body from req object, convert into column names with $ sql syntax for a SET query", function () {
    const testColsVals = sqlForPartialUpdate(
      {
        name: "Bauer-Gallagher",
        description: "Difficult ready trip question produce produce someone.",
        numEmployees: 1000,
      },
      {
        numEmployees: "num_employees",
        logoUrl: "logo_url",
      }
    );

    expect(testColsVals).toEqual({
      setCols: `"name"=$1, "description"=$2, "num_employees"=$3`,
      values: [
        "Bauer-Gallagher",
        "Difficult ready trip question produce produce someone.",
        1000,
      ],
    });
  });
});
