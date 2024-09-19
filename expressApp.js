var express = require('express');
var dotenv = require('dotenv')
const app = express();
const jwt = require('jsonwebtoken')
var bodyPaser= require('body-parser')
var path = require('path');
//var cors = require('cors');
var mysql = require('mysql2');
const bcrypt = require('bcrypt')
const secretKey = 'Prince1234567890'; 


app.use(bodyPaser.json())
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
dotenv.config();

//app.use(cors());

const dbcon = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    
})



dbcon.connect((err) => {
    if (err) {
        console.log('error connecting database')
        return;
    }
    console.log("DB connected sucessfully")
})
dbcon.query(`CREATE DATABASE IF NOT EXISTS expenseTracker_db`, (err) => {
    if (err) {
        console.log('ERROR CREATING DATABASE')
        return;
    }
    console.log("DATABASE CREATED SUCESSFULLY")
}
)
dbcon.query(`USE expenseTracker_db`, (err) => {
    if (err) {
        console.log("ERROR SELECTING DB")
        return;
    }
    console.log("DB SELECTED SUCESSFULLY")


})
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
user_id INT AUTO_INCREMENT PRIMARY KEY,
fullname VARCHAR(100) NOT NULL UNIQUE,
useremail VARCHAR(100) NOT NULL UNIQUE,
password VARCHAR(100) NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
`;
dbcon.query(createUsersTable, (err) => {
    if (err) {
        console.log("ERROR CREATING TABLE")
        return;
    }
    console.log("USERS TABLE SUCESSFULLY CREATED")
});
const createCategoriesTable = `
CREATE TABLE IF NOT EXISTS Categories (
category_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
category_name VARCHAR(100) NOT NULL,
FOREIGN KEY (user_id)REFERENCES users(user_id),
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
`;
dbcon.query(createCategoriesTable, (err) => {
    if (err) {
        console.log("ERROR CREATING CATEGORIES TABLE")
        return;
    }
    console.log("CATEGORIES TABLE SUCESSFULLY CREATED")
});


const createExpensesTable = `
CREATE TABLE IF NOT EXISTS Expenses (
expense_id INT AUTO_INCREMENT PRIMARY KEY,
expensename VARCHAR(50) NOT NULL,
user_id INT,
category_id INT,
amount DECIMAL(10,2) NOT NULL ,
date DATE NOT NULL,
FOREIGN KEY (user_id) REFERENCES users (user_id),
FOREIGN KEY (category_id) REFERENCES Categories (category_id),
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
`;
dbcon.query(createExpensesTable, (err) => {
    if (err) {
        console.log("ERROR CREATING  EXPENSES TABLE")
        return;
    }
    console.log("EXPENSES TABLE SUCESSFULLY CREATED")

});
const createPaymentMethodsTable = `
CREATE TABLE IF NOT EXISTS Payment_Methods (
paymentMethod_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
payment_method_name VARCHAR(100) NOT NULL ,
FOREIGN KEY (user_id) REFERENCES users (user_id),
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
`;
dbcon.query(createPaymentMethodsTable, (err) => {
    if (err) {
        console.log("ERROR CREATING PAYMENT METHODS TABLE")
        return;
    }
    console.log(" PAYMENT METHODS TABLE SUCESSFULLY CREATED")

});
const verifyToken = (req,res,next)=>{
    const authHeader =req.headers['authorization'];
    if(!authHeader){return res.json({message:'Access denied'})}
    const token = authHeader.split(' ')[1];
    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.json({ message: 'Invalid token' });
        }
if (err)return res.json({message:'Invalid token'})
 req.user_id = user.id;
next();

    })

}

app.get("/api/user/registration", (req,res)=>{
    res.sendFile(path.join(__dirname,'public','views','register.html'));
})
app.post("/api/user/registration", (req, res) => {
    
    const { fullname, useremail, password } = req.body;
    
    if(!fullname||!password){
        return res.json({message:"Username or password required"});
    }
    const hashedPassword = bcrypt.hashSync(password,10)
    
    const checkUser =`SELECT * FROM users WHERE fullname = ?`;
    dbcon.query(checkUser,[useremail],(err,result)=>{
        if (err){
        console.error('MySQL query error');
         return res.json({message:'DATAVASE QUERY FAILED'})
        }
        if(result.length>0){
            return res.json({message:'Username Already exists'})
        }
    
    })
    const newUser =`INSERT INTO users(fullname,useremail,password) VALUES(?,?,?)`;
    dbcon.query(newUser,[fullname,useremail,hashedPassword], (err,result)=>{
        if (err){console.error('My Sql insert error',err);

            return res.json({message:'registration failed'})
        }
         return res.json ({message:'registration successfull'})
    })



});
app.get("/api/user/login", (req,res)=>{
    res.sendFile(path.join(__dirname,'public','views','login.html'));
})

app.post('/api/user/login', (req,res)=>{
        const {useremail,password} = req.body;

        if(!useremail||!password){
         return res.json({message: 'Username and password required'});
    
        }
    const userinfo =`SELECT * FROM users WHERE useremail= ?`
    dbcon.query(userinfo,[useremail],(err,result)=>{
                if(err) {
                    console.error('MySQL query error:',err)
                    return res.json({message:'User not found'})
                } 

               if(result.length===0){
                return res.json({message:'Invalid credentials'})
               }
               
               const user =result[0];
                const isPasswordcorrect = bcrypt.compareSync(password,user.password)
              if(!isPasswordcorrect){
              return res.json ({message:"Incorrect email or password"})

              }
              const userData = result[0];
              const token = jwt.sign({
                id: userData.id,
                username:userData.username,
              },
              secretKey,
              {expiresIn:"1h"},

              )
              return res.json({message:'Login Sucessfull'})

    }
    )}
    )


app.get("/api/add/expenses", (req,res)=>{
    res.sendFile(path.join(__dirname,'public','views','add_expenses.html'));
}

)


app.post("/api/add/expenses", (req, res) => {
    const { expensename, amount, date } = req.body;

    if (!expensename || !amount || !date) {
        return res.status(400).json({ message: 'Enter expense information' });
    }

    const addExp = `INSERT INTO Expenses (expensename, amount, date) VALUES (?, ?, ?)`;

    dbcon.query(addExp, [expensename, amount, date], (err) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Could not capture expense' });
        }
        return res.status(201).json({ message: 'Expense added successfully' });
    });
});

app.get('/api/view/expenses', (req,res)=>{
    const viewExpenses = `SELECT * FROM Expenses`;
    dbcon.query(viewExpenses,(err,result)=>{
        if (err){
            return res.json({message:"Failed to display expenses"})
        }
        if (result.length === 0) {
            return res.json({ message: 'No expenses found' });
        }
        res.json(result)
    }
    )
})




 const PORT = process.env.PORT || 5000;

 app.listen(PORT, (err) => {
    if (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
    console.log(`Server running on port ${PORT}`);
});

