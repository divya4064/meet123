// to store names mapped with their socket Ids-->
const {Translate} = require('@google-cloud/translate').v2
var mapSocketWithNames = {};
let adminOfRoom = {};
var vote_counts = {} ;

let onlineUsers = [];

// #############################
const fs=require('fs');

// this is built on express Server

let express = require( 'express' );
// for server over ssl
const chalk = require('chalk');
const figlet = require('figlet');
var ip = require("ip");


const httpsOptions = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem')
     
   
 }
let app = express();
//let server = require('https').createServer(httpsOptions,app);
//let socketio = require('socket.io')(server);
let socketio = require( 'socket.io' );

const port = process.env.PORT || 443;

const expressServer = app.listen(port);
const io = socketio(expressServer);
//let io = require( 'socket.io' )( server ); //for ssl
//server.listen( port );
// database configs
// Firebase App (the core Firebase SDK) is always required and
// must be listed before other Firebase SDKs
var firebase = require("firebase/app");

// Add the Firebase products that you want to use
require("firebase/auth");
require("firebase/firestore");
require("firebase/database");

var firebaseConfig = {
    // apiKey: "AIzaSyAy51aw4heZf4N9OnKvNa2C5TFrJ9w03Do",
    // authDomain: "engage-e4adf.firebaseapp.com",
    // databaseURL: "https://engage-e4adf-default-rtdb.firebaseio.com",
    // projectId: "engage-e4adf",
    // storageBucket: "engage-e4adf.appspot.com",
    // messagingSenderId: "64483244309",
    // appId: "1:64483244309:web:7c611555bc4b918c72111c",
    // measurementId: "G-63BZQQVVKM"
    apiKey: "AIzaSyBa8WlmLrL1x-ad80p6wQPnpvfz3_97Im8",
    authDomain: "video-calls-c780d.firebaseapp.com",
    databaseURL: "https://video-calls-c780d-default-rtdb.firebaseio.com",
    projectId: "video-calls-c780d",
    storageBucket: "video-calls-c780d.appspot.com",
    messagingSenderId: "246075948760",
    appId: "1:246075948760:web:bd83f15f6d6f68a5c921ad",
    measurementId: "G-K1PDQVZNZQ"
  
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var db = firebase.database();
dbRef = db.ref();

// Ends here




let path = require( 'path' );
let favicon = require( 'serve-favicon' );
const { connected } = require('process');
const { join } = require('path');
const { isDate } = require('util');


figlet('Video Call Started', function(err, data) {
    if (err) {
        console.log(chalk.red('Something went wrong...'));
        console.dir(err);
        return;
    }
    console.log(chalk.blue(data))
    console.log(chalk.bgGreen.bold.black("https://"+ip.address()+":443\n\n"));
});


// View engine setup
app.engine('html', require('ejs').renderFile);
app.use( favicon( path.join( __dirname, 'favicon.ico' ) ) );
app.use( '/assets', express.static( path.join( __dirname, 'assets' ) ) );
app.use( '/src', express.static( path.join( __dirname, 'src' ) ) );
app.use( '/upload', express.static( path.join( __dirname, 'upload' ) ) );


var cookieParser = require('cookie-parser');
app.use(cookieParser());


let bodyparser = require("body-parser");
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());


// tell user to login -->
app.get('/login',(req,res)=>{
    res.render( __dirname + '/form.html',{room:req.query.room} );
})

// whenever get request is recieved on Server on join endpoint, render index.html file
app.get( '/join', ( req, res ) => {
    res.sendFile( __dirname + '/index.html' );
});


// user signs up
app.post('/signup', function(req,res){

    var name = req.body.name;
    var email =req.body.email.split("@")[0];
    var pass = req.body.password;
    let all_users = dbRef.child("users");

    try{
        all_users.once('value',(e)=>{
            if(e.val()[email]){
                res.render( __dirname + '/form.html',{room:req.query.room} );
            }
            if(req.query.room){
                
                // store in database
                dbRef.child("users").child(email).set({rooms:[email,req.query.room],
                    username:name, password:pass });
            }
            else{
                dbRef.child("users").child(email).set({rooms:[email],
                    username:name, password:pass });
            }
            res.cookie('name', name);
            res.cookie('email',email);
            return res.redirect('/dashboard');
        });
    }catch (e){
        console.log(e);
    }

});


// users logs in
app.post('/signin', function(req,res){

    var email =req.body.email.split("@")[0];
    var pass = req.body.password;

    //check whether user is member or not 
    let all_users = dbRef.child("users");

    try{
        all_users.once('value',(e)=>{
        
            if(e.val()[email]){
                if(e.val()[email]["password"] === pass){
    
                    if(req.query.room){
                        // store in database
                        room_ref = dbRef.child("users").child(email).child('rooms');
        
                        room_ref.once('value',(rm)=>{
                            let currentRoomsLength = Object.keys(rm.val()).length;
    
                            if(!Object.values(rm.val()).includes(req.query.room)){
                                room_ref.child(String(currentRoomsLength)).set(req.query.room);
                            }
                            
                        });
                    }
                    res.cookie('name', e.val()[email]["username"]);
                    res.cookie('email',email);
                    return res.redirect('/dashboard');
                }
            }
            res.sendFile( __dirname + '/form.html' );
        });
    }catch(e){
        console.log(e);
    }
   
    
});

// send user to dashboard -->
app.get('/dashboard',(req,res)=>{
    res.sendFile( __dirname + '/dashboard.html');
});
//
// Add this new route
// app.get('/attendance/:room', (req, res) => {
//     const room = req.params.room;

//     dbRef.child("attendance").child(room).once('value', (snapshot) => {
//         const attendance = snapshot.val();
//         res.json(attendance);
//     });
// });
// homepage of our web app
app.get('/',(req,res)=>{
    res.sendFile(__dirname+ '/homepage.html');
});


// join instant meeting using code 
app.post('/joinRoom',(req,res)=>{
    res.redirect("/join?room=" + req.body.roomCode );
});

//return new row of onlineusers
app.get('/onlineUsers', (req, res) => {
    res.json(onlineUsers);
});

//setup rout for attendance data 
app.get('/attendance/:room', (req, res) => {
    const room = req.params.room;

    dbRef.child("attendance").child(room).once('value', (snapshot) => {
        const attendance = snapshot.val();
        res.json(attendance);
    });
});

//
// main namespace for the meet functionality --------> 
io.of( '/stream' ).on( 'connection', (socket)=>{
    socket.on( 'subscribe', ( data ) => {

        socket.join( data.socketId ); // only join the sockets, room will be joined once admin admits.
        
    
        

        // at the beginning, subscribe to admin only 
        if(!socket.adapter.rooms[data.room]){
            //subscribe/join a room
            socket.join( data.room );
            adminOfRoom[data.room] = data.socketId;

            // if only single user is present, he'll be admin --->
            socket.emit('iAmAdmin');

        }
        else{
            //Inform admin in the room of new user's arrival
            socket.to(adminOfRoom[data.room]).emit('request-admin',data); // ask admin for entering to room.
        }


        // if a room doesn't exist, then vote_counts should be zero
        if(!vote_counts[data.room]){
            vote_counts[data.room] = 0;
        }

        // map name and socketID
        mapSocketWithNames[data.socketId] = data.username;

        // add user details
        onlineUsers.push(data);
        
        //attendence store in database
        console.log(data.username);
            console.log(Date.now());
        // dbRef.child("attendance").child(data.room).child(data.socketId).update({
        //    username: data.username,
        //     joinedAt: Date.now()
            
        // })
        dbRef.child(`attendance/${data.room}/${data.username}/joinTimes`).push(Date.now())
        .catch(err => {
            console.error('Error setting attendance:', err);
        });

        //when user leaves the meet
        socket.on("disconnect",()=>{
            // Track when a user leaves a meeting
            // dbRef.child("attendance").child(data.room).child(data.socketId).update({
            //     leftAt: Date.now()
            // })
            dbRef.child(`attendance/${data.room}/${data.username}/leaveTimes`).push(Date.now())
            .catch(err => { 
                console.error('Error setting attendance:', err);
            });
        });

    });

    // when user disconnects remove him from onlineUsers
    // When a user disconnects, remove them from the online users list
socket.on('disconnect', () => {
     // Log the socket ID of the disconnected user

    for(let i = 0; i < onlineUsers.length; i++){
        if('/stream#'+onlineUsers[i].socketId === socket.id){
            console.log('Removing user from onlineUsers:', onlineUsers[i]); // Log the user being removed
            onlineUsers.splice(i, 1);
            break;
        }
    }
 //update atttendance in database
    
});
    // file upload
    app.post('/upload', (req, res) => {
        const fileName = req.headers['file-name']; 
        
        req.on('data', (chunk) => { 
           fs.appendFileSync(__dirname + '/upload/' + fileName, chunk); 
       }) 
       res.end('uploaded'); 
    });

    // if access is granted, the user can connect (here this socket, which replies is admin)
    // so admin would inform the requesting participant that -- access has been granted
    socket.on('access-granted',(data)=>{
        socket.to( data.socketId ).emit( 'access has been granted',data);
    });

    // after access has been granted, join the room, and inform other users;
    socket.on('alert-other-users',(data)=>{
        let room_details = '';
        // participants join the room
        socket.join( data.room );
        socket.to( data.room ).emit( 'new user', { socketId: data.socketId } );
    });

    // if admin denies the permission, send info to the denied socket
    socket.on('access-denied',(data)=>{
        socket.to(data.socketId).emit("access-denied");
    });

    // send chat details when requested.
    socket.on('get-prev-chat',(room)=>{
        // send chats
        dbRef.child("rooms").once('value',(e)=>{
            room_details = e.val();
            // send the previous chats to the room;
            io.of('/stream').to(socket.id).emit('room-chat-details',{
                chats:room_details[room]});
        });
    });

    // send details of new user to previously present sockets

    socket.on( 'newUserStart', ( data ) => {
        socket.to( data.to ).emit( 'newUserStart', { sender: data.sender } );
    } );


    // session description protocol, contains all the information about medias, streams etc
    socket.on( 'sdp', ( data ) => {
        socket.to( data.to ).emit( 'sdp', { description: data.description, sender: data.sender } );
    } );

    // once the public address are known using stun and turn servers, we share ice candidates to
    // create the connection.
    socket.on( 'ice candidates', ( data ) => {
        socket.to( data.to ).emit( 'ice candidates', { candidate: data.candidate, sender: data.sender } );
    } );


    // chat
    socket.on( 'chat', ( data ) => {

        // send message only if socket is present in the room
        // ie. user has admitted him

        if(socket.adapter.rooms[data.room].sockets[socket.id] ){
            socket.to( data.room ).emit( 'chat', { sender: data.sender, msg: data.msg } );
        }

        // send message to sockets, which haven't joined the meet, but are on chats
        let snd = {
            room: data.room,
            timestamp: Date.now(),
            sendername : data.sender,
            message : data.msg,
            email: data.usermail
        };

        // store in database
        dbRef.child("rooms").child(snd.room).child(snd.timestamp).set({sender:snd.sendername,
            message:snd.message, email:snd.email });
        
        io.of('/user').to(data.room).emit('chat',snd);

    } );
    //FOR private-message
    socket.on('private-message', (data) => {
        socket.to(data.to).emit( 'chat', { sender: data.sender, msg: data.msg+' :Private-chat ' } );
        console.log(data.to);
    });


    // remove User Name from mapSocketWith Names 
    // when user leaves the meet
    socket.on("removeMyName",(elemId)=>{
        if(mapSocketWithNames[elemId]){
            delete mapSocketWithNames[elemId];
        }
    });

    // send usernames to clients -->
    socket.on('UpdateNamesOfUsers',()=>{
        //console.log(mapSocketWithNames);
        socket.emit('UpdateNamesOfUsers',mapSocketWithNames);
    });

    socket.on('sendPollToEveryUser',(room)=>{
        socket.to(room).emit("openYourPolls");
    });

    socket.on('recievedPoll',(data)=>{

        vote_counts[data.room] += data.vote;

        if(2*vote_counts[data.room] +1 >socket.adapter.rooms[data.room].length){
            socket.to(adminOfRoom[data.room]).emit("adminGiveABreak");
            vote_counts[data.room] = 0;
        }
        
    });

    //haind raise visibel for everyone
    socket.on('handRaised', (data) => {
        console.log(data.room);
        socket.broadcast.to(data.room).emit('handRaised', data);
    });
    
    
});



// user-dashboard namespace

io.of('/user').on('connection',(socket)=>{
    
    let users = '';
    let room_details = '';
    let room = '';
   //let attendance = '';

    socket.on('subscribe',(data)=>{

        socket.join(socket.id);
 
        let usermail = data.usermail;

       // send room details to the client
    dbRef.child("users").once('value')
    .then(e => {
        users = e.val();
        socket.emit('user-rooms',users[usermail].rooms);
    })
    .catch(err => {
        console.error('Error getting user rooms:', err);
    });

// send messages to the rooms
dbRef.child("rooms").once('value')
    .then(e => {
        room_details = e.val();
    })
    .catch(err => {
        console.error('Error getting room details:', err);
    });  
    });

    // Add this new event listener
// socket.on('disconnect', () => {
//     // Track when a user leaves a meeting
//     dbRef.child("attendance").child(room).child(socketId).update({
//         leftAt: Date.now()
//     });
// });
//file upload



//
    socket.on('get-room-chats',(roomName)=>{
        socket.emit('room-chat-details',{room:roomName,
                                        chats:room_details[roomName]});
        socket.join(roomName);

    });

    // store newly created room, which was created while scheduling a meet 
    socket.on('registerNewRoom',(data)=>{
        let room_ref = dbRef.child("users").child(data.email).child('rooms');
    
        room_ref.once('value',(rm)=>{
            let currentRoomsLength = Object.keys(rm.val()).length;
            room_ref.child(String(currentRoomsLength)).set(data.room);
        });
    });

    socket.on('chat',(data)=>{
        // store in database
        dbRef.child("rooms").child(data.room).child(data.timestamp).set({sender:data.sendername,
            message:data.message, email:data.email });

        socket.to(data.room).emit('chat',data);
        io.of('/stream').to(data.room).emit('chat',{ sender: data.sendername, msg: data.message });
    });


    //whene user disconnects the room
   

    


});
