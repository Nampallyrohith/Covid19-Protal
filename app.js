const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const jsonMiddleware = express.json();
app.use(jsonMiddleware);
let db = null;
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

const initializeDBServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(8080, () => {
      console.log("Server is live on 8080");
    });
  } catch (error) {
    console.log(`Message :${error}`);
    process.exit(1);
  }
};

initializeDBServer();

//Middleware function
const authenticationToken = (request, response, next) => {
  let jwtToken;
  const requestHeader = request.headers["authorization"];

  if (requestHeader !== undefined) {
    jwtToken = requestHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "SECRET_57", async (error, payLoad) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectedQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const query = await db.get(selectedQuery);

  if (query === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const checkPassword = await bcrypt.compare(password, query.password);
    if (checkPassword === true) {
      const payLoad = {
        username: username,
      };
      const jwtToken = jwt.sign(payLoad, "SECRET_57");
      response.send({ jwtToken });
      console.log(jwtToken);
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// API 2
app.get("/states/", authenticationToken, async (request, response) => {
  const getQuery = `
    SELECT * FROM state ORDER BY state_id;
    `;
  const query = await db.all(getQuery);
  response.send(query);
});

//API 3
app.get("/states/:stateId/", authenticationToken, async (request, response) => {
  const { stateId } = request.params;
  const getQuery = `
    SELECT * 
    FROM state
    WHERE state_id = ${stateId};
    `;
  const query = await db.get(getQuery);
  response.send(query);
});

// API 4
app.post("/districts/", authenticationToken, async (request, response) => {
    const {districtName, stateId, cases, cured, active, deaths} = request.body;
    const insertQuery = `
    INSERT INTO district(district_name, state_id, cases, cured, active, deaths) VALUES(
        
        '${districtName}', 
        ${stateId}, 
        ${cases},
        ${cured}, 
        ${active},
        ${deaths}        
    );
    `;
    const query = await db.run(insertQuery);
    response.send("District Successfully Added");
});
// API 5
app.get("/districts/:districtId/", authenticationToken, async (request, response) => {
  const { districtId } = request.params;
  const getQuery = `
    SELECT * 
    FROM district
    WHERE district_id = ${districtId};
    `;
  const query = await db.get(getQuery);
  response.send(query);
});

//API 6
app.delete("/districts/:districtId/", authenticationToken, async (request, response) => {
    const {districtId} = request.params;
    const deleteQuery = `
    DELETE FROM district
    WHERE district_id = ${districtId}
    `;
    const query = await db.run(deleteQuery);
    response.send("District Removed");
});

//API 7
app.put("/districts/:districtId/", authenticationToken, async (request, response) =>{
    const {districtId} = request.params;
    const {districtName, stateId, cases, cured, active, deaths} = request.body;
    const updateQuery = `
    UPDATE district SET
        district_name = '${districtName}',
        state_id = ${stateId}, 
        cases = ${cases},
        cured = ${cured}, 
        active = ${active},
        deaths = ${deaths}

    WHERE district_id = ${districtId};
    `;
    const query = await db.run(updateQuery);
    response.send("District Details Updated");
})

//API 8
app.get("/states/:stateId/stats/", authenticationToken, async (request, response) =>{
    const {stateId} = request.params;
    const getQuery = `
    SELECT SUM(cases) as totalCases, SUM(cured) as totalCured, 
    SUM(active) as totalActive, 
    SUM(deaths) as totalDeaths
    FROM district
    WHERE state_id = ${stateId}
    `
    const stats = await db.get(getQuery);
    response.send({
        totalCases: stats["totalCases"],
        totalCured: stats["totalCured"],
        totalActive: stats["totalActive"],
        totalDeaths: stats["totalDeaths"]
    })
})
module.exports = app;
