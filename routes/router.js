var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var mysql = require('mysql');
let hashPassword;

/* GET home page. */
router.get('/', async function(req, res, next) {
    let rows = await getSubmissions();
    let login = "Login";
    let logLink = "/login";
    console.log(rows);
    if (req.session && req.session.username && req.session.username.length) {
        login = "Logout";
        logLink = "/logout";
    }
    res.render('home', { 
        data: rows, 
        login: login,
        logLink: logLink
    });

});

/* GET post page. */
router.get('/post', async function(req, res, next) {
    let rows = await getPost(req.query.id);
    let login = "Login";
    let logLink = "/login";
    if (req.session && req.session.username && req.session.username.length) {
        login = "Logout";
        logLink = "/logout";
    }
    res.render('blogPost', { 
        data: rows,
        login: login,
        logLink: logLink
    });
});

/* GET submit post page. */
router.get('/add', function(req, res, next) {
    if (req.session && req.session.username && req.session.username.length) {
        res.render('entry', { title: 'Express' });
    }
    else {
     res.redirect('/login');
 }
});

/* POST submit post page. */
router.post('/submit', async function(req, res, next) {
    let successful = false;
    let userId = await getUserId(req.session.username);
    console.log(userId.user_id);
    let rows = await insertPost(req.body, userId.user_id);
    console.log(userId);
    console.log(rows);
    
    console.log("successful:", successful);

    res.json({
        successful: successful
    });
});

/* GET login page. */
router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Express' });
});

/* POST login page. */
router.post('/login', async function(req, res, next) {
    
    let successful = false;
    let rows = await loginUser(req.body);
    
    if (rows.length > 0) {
        if (bcrypt.compareSync(req.body.password, rows[0].password)) {
            req.session.username = req.body.username;
            successful = true;
            res.redirect('/');
        } 
    }
    
    res.json({
        successful: successful
    });
});

/* POST logout page. */
router.get('/logout', async function(req, res, next) {

    if (req.session && req.session.username && req.session.username.length) {
        delete req.session.username;
        res.redirect("/login");
    }

    res.json({
        successful: true,
        message: 'Logged out'
    });

});

/* GET register page. */
router.get('/register', function(req, res, next) {
    res.render('register');
    
    if (req.session && req.session.username && req.session.username.length) {
        res.redirect('/');
    }
});

/* POST register page. */
router.post('/register', async function (req, res) {
  
    let message = "User WAS NOT added to the database!";
    let successful = false;
    
    let newUser = await registerUser(req.body);

    if (newUser.affectedRows > 0) {
        successful = true;
        res.redirect('/');
    }
    
    res.json({
        successful: successful,
        message: message
    });
    
});

/* GET profile page. */
router.get('/profile', function(req, res, next) {
    res.render('profile');
});

/*Inserts user into the database with hashed password*/
function loginUser(body){
   
   let conn = dbConnection();
   
    return new Promise(function(resolve, reject){
        conn.connect(function(err) {
           if (err) throw err;
           let sql = `SELECT * 
                    FROM user
                    WHERE username = ? 
                         `;
           let params = [body.username];
           
           conn.query(sql, params, function (err, rows, fields) {
              if (err) 
                throw err;
              conn.end();
              resolve(rows);
           });

        });
    });
}

/*Inserts user into the database with hashed password*/
function registerUser(body){
    
   const saltRounds = 10;
   let conn = dbConnection();
   hashPassword = bcrypt.hashSync(body.password, saltRounds);
   console.log("Connected!");
   
    return new Promise(function(resolve, reject){
        conn.connect(function(err) {
           if (err) throw err;

           let sql = `INSERT INTO user
                      (username, password)
                      VALUES (?,?)`;
            
           console.log("hashPassword: ", hashPassword);
           let params = [body.username, hashPassword];
           
           conn.query(sql, params, function (err, rows, fields) {
              if (err) throw err;
              conn.end();
              resolve(rows);
           });

        });
    });
}

/*Inserts post into the database*/
function insertPost(body, userId){
   
   let conn = dbConnection();
   console.log("Connected!");
      console.log("body", body);
   
    return new Promise(function(resolve, reject){
        conn.connect(function(err) {
           if (err) throw err;
           let sql = `INSERT INTO post (post_title, post_content, post_category, 
           post_date, user_id)
                    VALUES(?,?,?, curdate(), ?)
                         `;
           let params = [body.title, body.contentText, body.category, userId];
           
           conn.query(sql, params, function (err, rows, fields) {
              if (err) 
                throw err;
              conn.end();
              resolve(rows);
           });

        });
    });
}

/*Gets user ID from the database*/
function getUserId(username){
   
   let conn = dbConnection();
   console.log("Connected!");
   
    return new Promise(function(resolve, reject){
        conn.connect(function(err) {
            if (err) throw err;
            let sql = `SELECT user_id
                       FROM user
                       WHERE username = ?
                         `;
           
           conn.query(sql, username, function (err, rows, fields) {
              if (err) 
                throw err;
              conn.end();
              resolve(rows[0]);
           });

        });
    });
}

/*Gets post from the database*/
function getPost(postId){
   
   let conn = dbConnection();
   console.log("Connected!");
   
    return new Promise(function(resolve, reject){
        conn.connect(function(err) {
            if (err) throw err;
            let sql = `SELECT post.post_title, post.post_category, 
            post.post_date, post.post_id, post.post_content, user.username
                       FROM post
                       INNER JOIN user ON post.user_id = user.user_id
                       WHERE post_id = ?
                         `;
           
           conn.query(sql, postId, function (err, rows, fields) {
              if (err) 
                throw err;
              conn.end();
              resolve(rows[0]);
           });

        });
    });
}

function getSubmissions(){
   
   let conn = dbConnection();
   console.log("Connected!");
   
    return new Promise(function(resolve, reject){
        conn.connect(function(err) {
            if (err) throw err;
            let sql = `SELECT post.post_title, post.post_category, 
            post.post_date, post.post_id, user.username
                       FROM post
                       INNER JOIN user ON post.user_id = user.user_id
                         `;
           
           conn.query(sql, function (err, rows, fields) {
              if (err) 
                throw err;
              conn.end();
              resolve(rows);
           });

        });
    });
}

/*Connects to SQL*/
function dbConnection(){

   let conn = mysql.createConnection({
            host: 'nt71li6axbkq1q6a.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
            user: 's30tqlvagxveatom',
            password: 'epfgae758k1rgc1n',
            database: 'fczrrr4d6imke5vw'
       }); //createConnection

    return conn;
}

module.exports = router;
