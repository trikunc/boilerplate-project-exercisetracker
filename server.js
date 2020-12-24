const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
require('dotenv').config();

const { Schema } = mongoose;
const app = express()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});

let exerciseSessionSchema = new Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
})

let userSchema = new Schema({
  username: {type: String, required: true},
  log: [exerciseSessionSchema]
})

let Session = mongoose.model("Session", exerciseSessionSchema)
let User = mongoose.model("User", userSchema)

app.post("/api/exercise/new-user", bodyParser.urlencoded({ extended: false }), (req, res) => {
  User.find({username: req.body.username}, (err, data) => {
    if(err) return console.error(err);
    console.log("iki bro:", data)
    if(data[0]) {
      res.send("Username already taken")
    } else {
      let newUser = new User({username: req.body.username})
      newUser.save((err, savedUser) => {
        if(!err) {
          let resObj = {}
          resObj["username"] = savedUser.username
          resObj["_id"] = savedUser.id
          res.json(resObj)
        }
      })
    }
  })
})

app.get("/api/exercise/users", (req, res) => {
  User.find((err, data) => {
    if(err) console.error(err)
    res.json(data)
  })
})

app.post("/api/exercise/add", bodyParser.urlencoded({ extended: false }), (req, res) => {

  let newSession = new Session({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date
  })

  if(req.body.date === "") {
    newSession.date = new Date().toISOString().substring(0, 10)
  }

  User.findByIdAndUpdate(
    req.body.userId,
    {$push: {log: newSession}},
    {new: true},
    (err, updatedUser) => {
      if(err) {
        console.error(err)
      } else {
        let resObj = {}
        resObj["_id"] = updatedUser.id
        resObj["username"] = updatedUser.username
        resObj["date"] = new Date(newSession.date).toDateString()
        resObj["description"] = newSession.description
        resObj["duration"] = newSession.duration
        res.json(resObj)
      }
    }
  )
})

app.get("/api/exercise/log", (req, res) => {
  User.findById(req.query.userId, (err, result) => {
    if(err) {console.error(err)}
    if(!err) {
      let resObj = {}
      // resObj = result
      resObj["_id"] = result.id
      resObj["username"] = result.username
      resObj["count"] = result.log.length
      resObj["log"] = result.log

      if(req.query.from || req.query.to) {

        let fromDate = new Date(0)
        let toDate = new Date()

        if(req.query.from) fromDate = new Date(req.query.from)
        if(req.query.to) toDate = new Date(req.query.to)

        fromDate = fromDate.getTime()
        toDate = toDate.getTime()

        resObj.log = resObj.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime()

          return sessionDate >= fromDate && sessionDate <= toDate
        })
      }
      
      if(req.query.limit) {
        resObj.log = resObj.log.slice(0, req.query.limit)
      }
      
      
      res.json(resObj)
    }
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
