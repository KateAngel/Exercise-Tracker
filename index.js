const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const bodyParser = require('body-parser')
const mongoose = require('mongoose');
let Schema = mongoose.Schema;

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//parse body elements from forms
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
//connect to a mongoose database
const uri = process.env.MONGO_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const connection = mongoose.connection;
connection.once("open", () => {
  console.log('Connected Database Successfully')
});
//building a new schema
let userSchema = new Schema({
  username: {type: String, required: true, unique: true},
  count: {type: Number, default: 0},
  log: [{
    description: { type: String },
    duration: { type: Number },
    date: { type: Date },
  }]
});

let User_model = mongoose.model('User_model', userSchema);

// find one by username
const findOneByUsername = (user, done) => {
  User_model
    .findOne({ username: user })
    .then((data) =>{
      done(null, data);
    })
    .catch((err) => {console.log({err, 'error':'username'}); return done(err);});
}

// create new user and save
const createAndSaveUser = (newUsername, done) => {
  const newUser = new User_model({username: newUsername});
  newUser
    .save()
    .then((data) => {
      done(null, {username: data.username, _id: data._id});
    })
    .catch((err) => {console.log({err, 'error':'save'}); return done(err);});
}

app.get('/api/users' , (req, res) => {
  User_model
    .find({})
    .then((users) => {
      res.send(users);
    });
 });

app.post('/api/users', (req, res) => {
  let input = req.body.username;
  if (input === null || input === '') { 
    return res.json({ error: 'invalid username' }); 
  }
  findOneByUsername(input, (err, data) => {
    if (err) {
      console.log({err, 'error':'findOneByUsername'});
      return res.json(err);
    }
    // if user exists already
    if (data) {
      res.json({username: data.username, _id: data._id});
    } else {
      createAndSaveUser(input, (err, doc) => {
        if (err) {
          console.log({err, 'error':'createAndSaveUser'});
          return res.json(err); 
        };
        res.json(doc);
      });
    }
  })
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const userID = req.body[':_id'] ? req.body[':_id'] : req.params._id;
  const description = req.body.description;
  const duration = parseInt(req.body.duration);
  const date = !req.body.date ? new Date().toDateString() : new Date(req.body.date).toDateString();
  if (userID === null || userID === '') { 
    return res.json({ error: 'invalid userID' }); 
  }
  const newExercise = {description: description, duration: duration, date: date };
  User_model
    .findByIdAndUpdate(userID, {$push: {log: newExercise}, $inc: {count: 1}}, {new: true})
    .then((data) => {
      res.send({
        username: data.username, 
        description: description, 
        duration: duration, 
        date: date, 
        _id: data._id});
    })
    .catch((err) => {console.log({err, 'error':'indByIdAndUpdate'});});
});

app.get('/api/users/:_id/logs' , (req, res) => {
  const userID = req.params._id;
  let { from, to, limit } = req.query;
  from = Date.parse(new Date(from));
  to = Date.parse(new Date(to));
  limit = parseInt(limit);

  User_model
    .findById(userID).exec()
    .then((data) => {
      if (data === null){
        res.json({error:"userId not found"})
      } else {
        let log = data.log;
        if (from){
          log = log.filter(item => (Date.parse(new Date(item.date))) > from);
        };
        if (to){
          log = log.filter(item => (Date.parse(new Date(item.date))) < to);
        };
        if (limit){
          log = log.slice(0, limit);
        };
        res.json({
          username: data.username, 
          count: data.count, 
          _id: data._id, 
          log: log
        });
      }
    });
 });

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
