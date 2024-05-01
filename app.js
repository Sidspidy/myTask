const express = require('express');
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

dbPath = path.join(__dirname, 'task.db');
let db = null;

const initializeDbAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        app.listen(3000, () => {
            console.log(`Server Running at http://localhost:3000/`);
        });
    } catch (error) {
        console.log(`DB Error: ${error.message}`);
        process.exit(1);
    }
};
initializeDbAndServer();

app.post('/register/', async (request, response) => {
    const {id,username, passwordHash} = request.body;
    
    const userCheckQuery = `
    SELECT * FROM users WHERE username = '${username}';`;
    const dbUser = await db.get(userCheckQuery);
    if(dbUser === undefined){
        if(password.length < 6){
             response.status(400);
            response.send('Password is too short');
        }else{
            const passwordHash = await bcrypt.hash(password, 10);
            const registerUserQuery = `
            INSERT INTO 
                user(id,username, password_hash)
            VALUES
                ('${id}', '${username}', '${passwordHash}');`;
            await db.run(registerUserQuery);
            response.send('User created successfully');
        }        
    }else{
        response.status(400);
        response.send('User already exists');
    }
});

const authenticateToken = (request,response,next)=>{
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined){
        jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined){
        response.status(401);
        response.send("Invalid JWT Token");
    } else {
        jwt.verify(jwtToken, "SECRET_KEY", async (error,payLoad) => {
            if (error){
                response.status(401);
                response.sent("Invalid JWT Token");
            } else {
                request.headers.username = payLoad.username;
                next();
            }
        })
    }
}

const outPutResult = (dbObject) => {
  return {
    id: dbObject.id,
    title: dbObject.title,
    description: dbObject.description,
    status: dbObject.status,
    assigneeId: dbObject.assignee_id,
    createdAt: dbObject.created_at,
    updatedAt: dbObject.updated_at,
  };
};

app.get("/tasks/", authenticateToken, async (request, response) => {
  let data = null;
  let getTasksQuery = "";
  const { search_q = "", status } = request.query;


  switch (true) {

    case hasStatusProperty(request.query):
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        getTasksQuery = `SELECT * FROM tasks WHERE status = '${status}';`;
        data = await database.all(getTasksQuery);
        response.send(data.map((eachItem) => outPutResult(eachItem)));
      } else {
        response.status(400);
        response.send("Invalid Tasks Status");
      }
      break;

    case hasSearchProperty(request.query):
        getTasksQuery = `select * from tasks where title like '%${search_q}%';`;
      data = await database.all(getTasksQuery);
      response.send(data.map((eachItem) => outPutResult(eachItem)));
      break;

    
    default:
        getTasksQuery = `select * from tasks;`;
      data = await database.all(getTasksQuery);
      response.send(data.map((eachItem) => outPutResult(eachItem)));
  }
});


app.get("/tasks/:id/", async (request, response) => {
  const { id } = request.params;
  const getTasksQuery = `select * from users where id=${id};`;
  const responseResult = await database.get(getTasksQuery);
  response.send(outPutResult(responseResult));
});

app.post('/tasks/:id/', authenticateToken, async (request, response) => {
    const {title} = request.body;
    const {username} = request.headers;
    const getUserQuery = `
    SELECT * FROM users WHERE username = '${username}';`; 
    const dbUser = await db.get(getUserQuery);
    const userId = dbUser['user_id'];

    const query = `
    INSERT INTO 
        tasks(title, user_id)
    VALUES ('${title}', ${userId});`;
    await db.run(query)
    response.send('Created a Task');
});


app.put("/tasks/:id/", async (request, response) => {
  const { id } = request.params;
  const requestBody = request.body;
  console.log(requestBody);
  const previousTasksQuery = `SELECT * FROM tasks WHERE id = ${id};`;
  const previousTask = await database.get(previousTasksQuery);
  const {
    title = previousTask.title ,
    description  = previousTask.description ,
    status = previousTask.status,
    assigneeId = previousTask.assigneeId,
    createdAt = previousTask.createdAt,
    updatedAt = previousTask.updatedAt,
  } = request.body;

  let updateTaskQuery;
  switch (true) {
    case requestBody.status !== undefined:
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        updateTaskQuery = `
    UPDATE todo SET title='${title}', description='${description}', status='${status}', assignee_id='${assigneeId}',
    created_at='${createdAt}', updated_at='${updatedAt}' WHERE id = ${assigneeId};`;

        await database.run(updateTaskQuery);
        response.send(`Status Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

  }

});


app.delete('/tasks/:id/', authenticateToken, async (request, response) => {
    const {id} = request.params;
    const {username} = request.headers;
    const getUserQuery = `
    SELECT * FROM users WHERE username = '${username}';`; 
    const dbUser = await db.get(getUserQuery);
    const userId = dbUser['users.id'];

    const userTasksQuery = `
    SELECT tasks.id, users.id 
    FROM tasks
    WHERE users.id = ${userId};`;
    const userTasksData = await db.all(userTasksQuery);


    let isTaskUsers = false;
    userTasksData.forEach((each) => {
        if(each['tasks.id'] == id){
            isTaskUsers = true;        
        }
    });

    if(isTaskUsers){
        const query = `
        DELETE FROM tasks
        WHERE tasks.id = ${id};`;
        await db.run(query);
        response.send('Task Removed');        
    }else{
        response.status(401);
        response.send('Invalid Request');
    }
});

module.exports = app;