/* eslint-disable quotes */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
'use strict';
// dotenv
require('dotenv').config();

//dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const methodOverride = require('method-override');
const pg = require('pg');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('./public'));
app.set('view engine', 'ejs');

// database
// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// routes
app.get('/',homeHandler);
app.post('/search',searchHandler);
app.post('/addBook',addHandler);
app.get('/details/:bookID',detailsHandler);
app.put('/updateBook/:bookID',updateHandler);
app.delete('/deleteBook/:bookID',deleteHandler);
app.get('*',errorHandler);
// handlers

function homeHandler(req,res){
  let SQL = `SELECT * FROM books;`;
  client.query(SQL)
    .then(result => {
    //   console.log(result.rows);
      res.render('pages/index',{bookArray:result.rows});
    });
}

function searchHandler(req,res){
  let bookArr =[];
  let book = req.body.book;
  let choice = req.body.choice;
  let bookURL = `https://www.googleapis.com/books/v1/volumes?q=+${choice}:${book}`;
  superagent.get(bookURL)
    .then(result => {
      let rData = result.body.items;
      rData.forEach(bookInfo =>{
        let newBook = new Book(bookInfo);
        bookArr.push(newBook);
      });
      res.render('pages/search',{bookArray:bookArr});
    }).catch(error =>{
      res.send(error);
    });
}

function addHandler(req,res){
  let {title,author,isbn,date,image_url,description} = req.body;
  //   console.log(req.body);
  let SQL = `SELECT * FROM books WHERE isbn=$1;`;
  let check =[isbn];
  client.query(SQL,check)
    .then(result =>{
      if(result.rowCount){
        res.send('Book already in the list');
      }
      else {
        SQL = `INSERT INTO books (title,author,isbn,date,image_url,description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *;`;
        let safeValues = [title,author,isbn,date,image_url,description];
        client.query(SQL,safeValues)
          .then(result => {
            res.redirect('/');
          }).catch(error =>{
            res.send(error);
          });
      }
    });
}

function detailsHandler (req,res){
  let idValue = [req.params.bookID];
  let SQL =`SELECT * FROM books WHERE id=$1;`;
  client.query(SQL,idValue)
    .then(result =>{
    //   console.log(result.rows[0]);
    //   console.log(idValue);
      res.render('pages/details',{book:result.rows[0]});
    });
}

function updateHandler(req,res){
  let {title,author,isbn,date,image_url,description} = req.body;
  let idValue = req.params.bookID;
  let SQL =`UPDATE books SET title=$1,author=$2,isbn=$3,date=$4,image_url=$5,description=$6 WHERE id=$7;`;
  let safeValues =[title,author,isbn,date,image_url,description,idValue];
  client.query(SQL,safeValues)
    .then(result => {
      res.redirect(`/details/${idValue}`);
    });
}
function deleteHandler(req,res){
  let idValue = [req.params.bookID];
  let SQL = `DELETE FROM books where id=$1;`;
  client.query(SQL,idValue)
    .then( res.redirect('/'));

}

function errorHandler(req,res){
  res.render('pages/error');
}
//constructors

function Book (bookData){
  this.title = (bookData.volumeInfo.title) ? bookData.volumeInfo.title : 'Not available';
  this.author = (bookData.volumeInfo.authors) ? bookData.volumeInfo.authors.join(',') : 'Not available';
  this.isbn = (bookData.volumeInfo.industryIdentifiers[0]) ? bookData.volumeInfo.industryIdentifiers[0].identifier : 'Not available';
  this.date = (bookData.volumeInfo.publishedDate) ? bookData.volumeInfo.publishedDate : 'Not available';
  this.image_url = (bookData.volumeInfo.imageLinks) ? bookData.volumeInfo.imageLinks.thumbnail : 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
  this.description = (bookData.volumeInfo.description) ? bookData.volumeInfo.description : 'Not available';
}
// port listener
client.connect()
  .then(()=>{
    app.listen(PORT,()=>
      console.log(`Listening on port: ${PORT}`)
    );
  });
