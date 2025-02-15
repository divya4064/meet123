//import {Translate} from '@google-cloud/translate';
//const {Translate} = require('@google-cloud/translate').v2;
//const translate = new Translate();
//import {Translate} from '@google-cloud/translate';

let isAdmin = false;
let startTime = "";

import h from './helpers.js';

window.addEventListener( 'load', () => {

    const room = h.getQString( location.href, 'room' );
    const username = sessionStorage.getItem( 'username' );
    let usermail = sessionStorage.getItem( 'email' );

    if(!usermail){
        usermail = "unknown";
    }

    // if room is not defined
    if ( !room ) {
        document.querySelector( '#room-create' ).attributes.removeNamedItem( 'hidden' );
    }

    else if ( !username ) {
        document.querySelector( '#username-set' ).attributes.removeNamedItem( 'hidden' );
    }

    else {
        let commElem = document.getElementsByClassName( 'room-comm' );

        for ( let i = 0; i < commElem.length; i++ ) {
            commElem[i].attributes.removeNamedItem( 'hidden' );
        }

        var pc = [];
        
        let socket = io( '/stream' );

        var socketId = '';
        var myStream = '';
        var screen = '';
        var recordedStream = [];
        var mediaRecorder = '';

        //Get user video by default
        getAndSetUserStream();


        socket.on( 'connect', () => {
            //set socketId
            socketId = socket.io.engine.id;

            socket.emit( 'subscribe', {
                room: room,
                socketId: socketId,
                username: username
            } );

            // admin would trigger the timer popup, since he'll be present before others join
            // for now, use 1:30 minutes for Have a break.
            socket.on( 'iAmAdmin',()=>{
                isAdmin = true;
                startTime = Date.now();

                const interval = setInterval(()=>{
                    if((Date.now() - startTime) > 900*1000){
                        socket.emit("sendPollToEveryUser",room);
                        clearInterval(interval);
                    }
                },1000);

            });

            // ask admin to join the room , give permission to admin only

            socket.on('request-admin',(data)=>{
                if(isAdmin){
                    let userName_admit = data.username;
                    let socketid_admit = data.socketId;
                    let roomName_admit = data.room;

                    // ###############################  ###########################
                    
                    let base_container = document.getElementById("user-admit");
                    let newRequestElement = document.createElement("div");
                    newRequestElement.className = 'row user-admit-childs mx-auto';
                    newRequestElement.id = roomName_admit + "@" + userName_admit +"@" + socketid_admit;
                    
                    newRequestElement.innerHTML = `<div class="col-9 col-md-9 col-xs-8 col-lg-9 col-sm-7 pl-5 px-0"><b>${userName_admit}</b></div>
                    <div class="col-3 col-md-3 col-lg-3 col-sm-5 text-center col-xs-4 px-0">
                      <a class="px-1 deny-request" style="text-decoration: none;color: blue;" >Deny</a>
                      <a class="px-1 accept-request" style="text-decoration: none;color: blue;">Admit</a>
                    </div>
                    <hr>`;
                    
                    base_container.appendChild(newRequestElement);
                    // play tone to remind admit when someone sends admit request
                    let audio = new Audio('../assets/tones/admit-request.mp3');
                    audio.play();


                    if(base_container.children.length > 1){
                        document.getElementById("who").innerText = "Multiple People want";
                        document.getElementById("deny-all").innerText = "Deny All";
                        document.getElementById("view-all").innerText = "View All";
                        document.getElementById("admit-all").innerText = "Admit All";
                    }
                    else{
                        document.getElementById("who").innerText = "Someone wants";
                        document.getElementById("deny-all").innerText = "Deny";
                        document.getElementById("view-all").innerText = "View";
                        document.getElementById("admit-all").innerText = "Admit";
                    }

                    document.getElementById('user-lobby').hidden = false;

                    let userDenyElement = newRequestElement.children[1].children[0];
                    let userAcceptElement = newRequestElement.children[1].children[1];
                    

                    userDenyElement.addEventListener('click',()=>{

                        socket.emit("access-denied",data);

                        newRequestElement.remove();
              
                        if(document.getElementById('user-admit').children.length == 0){
                          document.getElementById('user-lobby').hidden = true;
                          h.collapse_admit(true);
                        }
              
                    });

                    userAcceptElement.addEventListener('click',()=>{
            
                        socket.emit("access-granted",data);
                        newRequestElement.remove();
              
                        if(document.getElementById('user-admit').children.length == 0){
                          document.getElementById('user-lobby').hidden = true;
                          h.collapse_admit(true);
                        }
              
                    });



                    // #######################################################################

                }
            });

            // ########################################################################
            // if admin denied access -->

            socket.on('access-denied',()=>{
                document.getElementById('acc-denied').hidden = false;
            });

            document.getElementById('back-to-dashboard').addEventListener('click',()=>{
                window.location.href =  "/dashboard";
            });

            //##########################################################################

            document.getElementById('view-all').addEventListener('click',()=>{
                h.collapse_admit(false);
            });


            document.getElementById('deny-all').addEventListener('click',()=>{
                document.querySelectorAll('.user-admit-childs').forEach(element =>{
                    let temp_data = element.id.split("@");
                    socket.emit("access-denied",{
                        room:temp_data[0],
                        username:temp_data[1],
                        socketId:temp_data[2]
                    });
                    element.remove();
                });
                document.getElementById('user-lobby').hidden = true;
                h.collapse_admit(true);
                
            });
      
            document.getElementById('admit-all').addEventListener('click',()=>{
              document.querySelectorAll('.user-admit-childs').forEach(element =>{
                let temp_data = element.id.split("@");
                socket.emit("access-granted",{
                    room:temp_data[0],
                    username:temp_data[1],
                    socketId:temp_data[2]
                });
                element.remove();
                });
              document.getElementById('user-lobby').hidden = true;
              h.collapse_admit(true);
            });


            //##########################################################################

            socket.on('access has been granted',(data)=>{
                socket.emit('alert-other-users',data);
            });

            


            // when everyone recieves trigger to show poll

            socket.on('openYourPolls',()=>{
                h.askForPoll(); // will unhide polling

                document.getElementById("need-break").addEventListener('click',()=>{
                    document.querySelector(".wrapper").hidden = true;
                    socket.emit("recievedPoll",{"vote":1,"room":room});
                });
                document.getElementById("no-break").addEventListener('click',()=>{
                    document.querySelector(".wrapper").hidden = true;
                    socket.emit("recievedPoll",{"vote":0,"room":room});
                });
            });

            // tell admin to give break , 
            socket.on('adminGiveABreak',()=>{
                document.querySelector(".wrapper-admin").hidden = false;
            });



            socket.on( 'new user', ( data ) => {

                // play tone to remind admit when someone joins the meet
                let audio = new Audio('../assets/tones/user-joined.mp3');
                audio.play();

                socket.emit( 'newUserStart', { to: data.socketId, sender: socketId } );
                pc.push( data.socketId );
                init( true, data.socketId );
            } );


            socket.on( 'newUserStart', ( data ) => {
                pc.push( data.sender );
                init( false, data.sender );
            } );

            // update usernames on their videos --> :)
            socket.on('UpdateNamesOfUsers',(mapSocketWithNames)=>{
                h.setUserNames( mapSocketWithNames ); // create a helper function to set usernames.
            });


            socket.on( 'ice candidates', async ( data ) => {
                data.candidate ? await pc[data.sender].addIceCandidate( new RTCIceCandidate( data.candidate ) ) : '';
            } );


            socket.on( 'sdp', async ( data ) => {
                if ( data.description.type === 'offer' ) {
                    data.description ? await pc[data.sender].setRemoteDescription( new RTCSessionDescription( data.description ) ) : '';

                    h.getUserFullMedia().then( async ( stream ) => {
                        if ( !document.getElementById( 'local' ).srcObject ) {
                            h.setLocalStream( stream );
                        }

                        //save my stream
                        //save my stream
                        if (!stream.getVideoTracks) {
                            stream.getVideoTracks = function() {
                              if (!this.getTracks) {
                                return [];
                              }
  
                              var tracks = [];
                              this.getTracks.forEach(function(track) {
                                if (track.kind.toString().indexOf('video') !== -1) {
                                  tracks.push(track);
                                }
                              });
                              return tracks;
                            };
  
                            stream.getAudioTracks = function() {
                              if (!this.getTracks) {
                                return [];
                              }
  
                              var tracks = [];
                              this.getTracks.forEach(function(track) {
                                if (track.kind.toString().indexOf('audio') !== -1) {
                                  tracks.push(track);
                                }
                              });
                              return tracks;
                            };
                          }

                        //
                        myStream = stream;

                        stream.getTracks().forEach( ( track ) => {
                            pc[data.sender].addTrack( track, stream );
                        } );

                        let answer = await pc[data.sender].createAnswer();

                        await pc[data.sender].setLocalDescription( answer );

                        socket.emit( 'sdp', { description: pc[data.sender].localDescription, to: data.sender, sender: socketId } );
                    } ).catch( ( e ) => {
                        console.error( e );
                    } );
                }

                else if ( data.description.type === 'answer' ) {
                    await pc[data.sender].setRemoteDescription( new RTCSessionDescription( data.description ) );
                }
            } );

            // add a click listener, to load chats, only when user asks
            document.querySelector( '#toggle-chat-pane' ).addEventListener( 'click', ( e ) => {
                if(document.getElementById("chat-messages").innerHTML === ""){
                    socket.emit("get-prev-chat",room);
                }
            });

            // load previous chat history
            socket.on('room-chat-details',(data)=>{
                if(data.chats){
                    let data_length = Object.keys(data.chats).length;
                    if(data_length){
                        let ts = Object.keys(data.chats);
                        for(var i=0;i<data_length;i++){

                            h.addChat({sender:data.chats[ts[i]].sender,
                                msg:data.chats[ts[i]].message,
                            timestamp:Number(ts[i]) },'remote', true);

                        }
                    }
                }
            });

            socket.on( 'chat', ( data ) => {
                h.addChat( data, 'remote',false );
            } );
        } );


        function getAndSetUserStream() {
            h.getUserFullMedia().then( ( stream ) => {
                //save my stream
                myStream = stream;

                h.setLocalStream( stream );
            } ).catch( ( e ) => {
                console.error( `stream error: ${ e }` );
            } );
        }


        function sendMsg( msg ) {
            let recipientId = document.getElementById('private-chat-select').value;
             
            if (recipientId === room) {
           // This is a broadcast message
                           let data = {
                           room: room,
                           msg: msg,
                            sender: username,
                         usermail : usermail
                        };

                     //emit chat message
                     socket.emit( 'chat', data );

                   //add localchat
                     h.addChat({sender:username,msg:msg, timestamp:Date.now() },'local', false);
                   }
            //  socket.emit('broadcast message', { content: messageContent });

             else {  // This is a private message   
                let data = {
                    room: room,
                    msg: msg,
                    sender: username,
                    usermail : usermail,
                    to: recipientId  
            
                  }
                    socket.emit('private-message', data);
                   // console.log(data);
                    h.addChat({sender:username,msg:msg, timestamp:Date.now() },'local', false);


        }
    }



        function init( createOffer, partnerName ) {
            pc[partnerName] = new RTCPeerConnection( h.getIceServer() );

            if ( screen && screen.getTracks().length ) {
                screen.getTracks().forEach( ( track ) => {
                    pc[partnerName].addTrack( track, screen );//should trigger negotiationneeded event
                } );
            }

            else if ( myStream ) {
                myStream.getTracks().forEach( ( track ) => {
                    pc[partnerName].addTrack( track, myStream );//should trigger negotiationneeded event
                } );
            }

            else {
                h.getUserFullMedia().then( ( stream ) => {
                    //save my stream
                    myStream = stream;

                    stream.getTracks().forEach( ( track ) => {
                        pc[partnerName].addTrack( track, stream );//should trigger negotiationneeded event
                    } );

                    h.setLocalStream( stream );
                } ).catch( ( e ) => {
                    console.error( `stream error: ${ e }` );
                } );
            }



            //create offer
            // if ( createOffer ) {
            //     pc[partnerName].onnegotiationneeded = async () => {
            //         let offer = await pc[partnerName].createOffer();

            //         await pc[partnerName].setLocalDescription( offer );

            //         socket.emit( 'sdp', { description: pc[partnerName].localDescription, to: partnerName, sender: socketId } );
            //     };
            // }
            // Handle 'newUserStart' event
           if (createOffer) {
             pc[partnerName].onnegotiationneeded = async () => {
                if (pc[partnerName].signalingState == "stable") {
                let offer = await pc[partnerName].createOffer();
                       await pc[partnerName].setLocalDescription(offer);
                 socket.emit('sdp', { description: pc[partnerName].localDescription, to: partnerName, sender: socketId });
        } else {
            console.log("The connection isn't stable yet. Waiting...");
        }
    };
}


            //send ice candidate to partnerNames
            pc[partnerName].onicecandidate = ( { candidate } ) => {
                socket.emit( 'ice candidates', { candidate: candidate, to: partnerName, sender: socketId } );
            };



            //add
            //
            pc[partnerName].ontrack = ( e ) => {
                let str = e.streams[0];
                if ( document.getElementById( `${ partnerName }-video` ) ) {
                    document.getElementById( `${ partnerName }-video` ).srcObject = str;
                }

                else {
                    //video elem
                    let newVid = document.createElement( 'video' );
                    newVid.id = `${ partnerName }-video`;
                    newVid.srcObject = str;
                    newVid.autoplay = true;
                    newVid.className = 'remote-video';

                    //video controls elements
                    let controlDiv = document.createElement( 'div' );
                    controlDiv.className = 'remote-video-controls';
                    controlDiv.innerHTML = `<i class="fa fa-fw fa-microphone text-white pr-3 mr-3 mute-remote-mic" title="Mute"></i>
                        <i class="fa fa-fw fa-thumbtack text-white expand-remote-video" title="Pin Video"></i>`;

                    // show user names 
                    let nameDiv = document.createElement( 'div' );
                    nameDiv.className = 'participant-names';
                    nameDiv.id = `${partnerName}-username`;
                    
                    //create a new div for card
                    let cardDiv = document.createElement( 'div' );
                    cardDiv.className = 'card card-sm vid-card';
                    cardDiv.id = partnerName;
                    cardDiv.appendChild( newVid );
                    cardDiv.appendChild( controlDiv );
                    cardDiv.appendChild( nameDiv );

                    //put div in main-section elem
                    document.getElementById( 'videos' ).appendChild( cardDiv );

                    h.adjustVideoElemSize();
                }

                socket.emit('UpdateNamesOfUsers'); //trigger server to send usernames
            };



            pc[partnerName].onconnectionstatechange = ( d ) => {
                switch ( pc[partnerName].iceConnectionState ) {
                    case 'disconnected':
                    case 'failed':
                        h.closeVideo( partnerName,socket );
                        break;

                    case 'closed':
                        h.closeVideo( partnerName,socket );
                        break;
                }
            };


            // signaling state change
            pc[partnerName].onsignalingstatechange = ( d ) => {
                switch ( pc[partnerName].signalingState ) {
                    case 'closed':
                        console.log( "Signalling state is 'closed'" );
                        h.closeVideo( partnerName, socket );
                        break;
                }
            };
        }



        function shareScreen() {
            h.shareScreen().then( ( stream ) => {
                h.toggleShareIcons( true );

                //disable the video toggle btns while sharing screen. This is to ensure clicking on the btn does not interfere with the screen sharing
                //It will be enabled was user stopped sharing screen
                h.toggleVideoBtnDisabled( true );

                //save my screen stream
                screen = stream;

                //share the new stream with all partners
                broadcastNewTracks( stream, 'video', false );

                //When the stop sharing button shown by the browser is clicked
                screen.getVideoTracks()[0].addEventListener( 'ended', () => {
                    stopSharingScreen();
                } );
            } ).catch( ( e ) => {
                console.error( e );
            } );
        }



        function stopSharingScreen() {
            //enable video toggle btn
            h.toggleVideoBtnDisabled( false );

            return new Promise( ( res, rej ) => {
                screen.getTracks().length ? screen.getTracks().forEach( track => track.stop() ) : '';

                res();
            } ).then( () => {
                h.toggleShareIcons( false );
                broadcastNewTracks( myStream, 'video' );
            } ).catch( ( e ) => {
                console.error( e );
            } );
        }



        function broadcastNewTracks( stream, type, mirrorMode = true ) {
            h.setLocalStream( stream, mirrorMode );

            let track = type == 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];

            for ( let p in pc ) {
                let pName = pc[p];

                if ( typeof pc[pName] == 'object' ) {
                    h.replaceTrack( track, pc[pName] );
                }
            }
        }


        function toggleRecordingIcons( isRecording ) {
            let e = document.getElementById( 'record' );

            if ( isRecording ) {
                e.setAttribute( 'title', 'Stop recording' );
                e.children[0].classList.add( 'text-danger' );
                e.children[0].classList.remove( 'text-white' );
            }

            else {
                e.setAttribute( 'title', 'Record' );
                e.children[0].classList.add( 'text-white' );
                e.children[0].classList.remove( 'text-danger' );
            }
        }


        function startRecording( stream ) {
            mediaRecorder = new MediaRecorder( stream, {
                mimeType: 'video/webm;codecs=vp9'
            } );

            mediaRecorder.start( 1000 );
            toggleRecordingIcons( true );

            mediaRecorder.ondataavailable = function ( e ) {
                recordedStream.push( e.data );
            };

            mediaRecorder.onstop = function () {
                toggleRecordingIcons( false );

                h.saveRecordedStream( recordedStream, username );

                setTimeout( () => {
                    recordedStream = [];
                }, 3000 );
            };

            mediaRecorder.onerror = function ( e ) {
                console.error( e );
            };
        }


        //Chat Section #####################################################################
        document.getElementById( 'chat-input' ).addEventListener( 'keypress', async( e ) => {
            if ( e.which === 13 && ( e.target.value.trim() ) ) {
                e.preventDefault();
                let sourceLanguageSelectionElem = document.getElementById('source-language-selection');
                let sourceLanguage = sourceLanguageSelectionElem.options[sourceLanguageSelectionElem.selectedIndex].value;
        
                // Get the selected target language
                let targetLanguageSelectionElem = document.getElementById('target-language-selection');
                let targetLanguage = targetLanguageSelectionElem.options[targetLanguageSelectionElem.selectedIndex].value;

                // If the source and target languages are not the same, translate the message
                if (sourceLanguage !== targetLanguage) {
                    const response =  await translatetext(e.target.value, targetLanguage);
                    //console.log(response);
                    e.target.value = response;        
                }

                sendMsg( e.target.value );

                setTimeout( () => {
                    e.target.value = '';
                }, 50 );
            }
        } );

        // document.getElementById( 'chat-icon-send' ).addEventListener( 'click', ( e ) => {
        //     let text_elem = document.getElementById( 'chat-input' );

        //     if( text_elem.value !== '' ){
        //         e.preventDefault();

        //         sendMsg(text_elem.value);

        //         setTimeout( () => {
        //             text_elem.value = '';
        //         }, 50 );
        //     }
        // } );
        //  file upload section
         //Chat Section #####################################################################
        
         document.getElementById( 'chat-icon-send' ).addEventListener( 'click', async( e ) => {
           // console.log(ups);
            // Get the selected source language
        let sourceLanguageSelectionElem = document.getElementById('source-language-selection');
        let sourceLanguage = sourceLanguageSelectionElem.options[sourceLanguageSelectionElem.selectedIndex].value;

        // Get the selected target language
        let targetLanguageSelectionElem = document.getElementById('target-language-selection');
        let targetLanguage = targetLanguageSelectionElem.options[targetLanguageSelectionElem.selectedIndex].value;

        // If the source and target languages are not the same, translate the message
        
            
            if(ups==0){
                let text_elem = document.getElementById( 'chat-input' );

                if( text_elem.value !== '' ){
                    e.preventDefault();
                    // Translate the message
                    if (sourceLanguage !== targetLanguage) {
                        const response =  await translatetext(text_elem.value, targetLanguage);
                       // console.log(response);
                        text_elem.value = response;        
        }
                       
                            
                    
    
                    sendMsg(text_elem.value);
    
                    setTimeout( () => {
                        text_elem.value = '';
                    }, 50 );
                }
            }else{
                let text_elem=$('#chat-input');
                uploadFile(); 
                const html = '<a href="upload/' + text_elem.val() + '" target="_blank">'
         + text_elem.val() + '</a>'; 
                if( text_elem.value !== '' ){
                    e.preventDefault();
    
                    sendMsg(html);
    
                    setTimeout( () => {
                        text_elem.val('');
                    }, 50 );
                }
            }
        } );

       
        

        function uploadFile() { 
            alert("uploading file..."); 
            ups = 0; 
            const file = document.getElementById("file"); 
            console.log(file.files[0]);
            const fileReader = new FileReader();
            const theFile = file.files[0]; 
            fileReader.onload = async (ev) => { 
            const chunkCount = Math.floor(ev.target.result.byteLength / (1024 * 1024)) + 1; 
            const CHUNK_SIZE = ev.target.result.byteLength / chunkCount; 
            const fileName = theFile.name; 
            for (let chunkId = 0; chunkId < chunkCount + 1; chunkId++) { 
                const chunk = ev.target.result.slice(chunkId * CHUNK_SIZE, chunkId * CHUNK_SIZE + CHUNK_SIZE) 
                await fetch('/upload', 
                { method: 'POST',
                 headers: { 
                'content-type': 'application/octet-stream', 
                 'file-name': fileName, 
                 'content-length': chunk.length 
                }, 
                body: chunk, 
            }) 
        } 
    } 
    fileReader.readAsArrayBuffer(theFile); 
    console.log("file uploaded");
    file.value = ""; 
}

   

        // #####################################################################



        //When the video icon is clicked
        document.getElementById( 'toggle-video' ).addEventListener( 'click', ( e ) => {
            e.preventDefault();

            let elem = document.getElementById( 'toggle-video' ).children[0];

            if ( myStream.getVideoTracks()[0].enabled ) {
                elem.classList.remove( 'fa-video' );
                elem.classList.add( 'fa-video-slash' );
                elem.setAttribute( 'title', 'Show Video' );

                myStream.getVideoTracks()[0].enabled = false;
            }

            else {
                elem.classList.remove( 'fa-video-slash' );
                elem.classList.add( 'fa-video' );
                elem.setAttribute( 'title', 'Hide Video' );

                myStream.getVideoTracks()[0].enabled = true;
            }

            broadcastNewTracks( myStream, 'video' );
        } );


        //When the mute icon is clicked
        document.getElementById( 'toggle-mute' ).addEventListener( 'click', ( e ) => {
            e.preventDefault();

            let elem = document.getElementById( 'toggle-mute' ).children[0];

            if ( myStream.getAudioTracks()[0].enabled ) {
               
                elem.classList.remove( 'fa-microphone-alt' );
                elem.classList.add( 'fa-microphone-alt-slash' );
                elem.setAttribute( 'title', 'Unmute' );

                myStream.getAudioTracks()[0].enabled = false;
            }

            else {
                elem.classList.remove( 'fa-microphone-alt-slash' );
                elem.classList.add( 'fa-microphone-alt' );
                elem.setAttribute( 'title', 'Mute' );

                myStream.getAudioTracks()[0].enabled = true;
            }

            broadcastNewTracks( myStream, 'audio' );
        } );
        //hand raise feature
        document.getElementById("hand-raise").addEventListener('click',(e)=>{
            e.preventDefault();
            let elem = document.getElementById( 'hand-raise' ).children[0];
            if(elem.classList.contains('fa-hand-paper')){
                elem.classList.remove('fa-hand-paper');
                elem.classList.add('fa-hand-sparkles');
                elem.setAttribute( 'title', 'Lower Hand' );
                socket.emit("handRaised",{
                    room:room,
                    username:username,
                    socketId:socketId
                });
            }
            else{
                elem.classList.remove('fa-hand-sparkles');
                elem.classList.add('fa-hand-paper');
                elem.setAttribute( 'title', 'Raise Hand' );
                socket.emit("handRaised",{
                    room:room,
                    username:username,
                    socketId:socketId
                });
            }
        });
       
        //handle handRaised event
        socket.on('handRaised', (data) => {
            console.log("hand raised");
           
            let elem = document.getElementById('hand-raise').children[0];
            if (elem.classList.contains('fa-hand-paper')) {
                elem.classList.remove('fa-hand-paper');
                elem.classList.add('fa-hand-sparkles');
                elem.setAttribute('title', 'Lower Hand');
                // Show a pop-up notification
                let modal = document.getElementById("handRaiseModal");
                let span = document.getElementById("closeModal");
                let modalText = document.getElementById("modalText");
                modalText.textContent = ` 🖐️${data.username} has raised their hand.`;
                modal.style.display = "block";
                span.onclick = function() {
                   modal.style.display = "none";
               }
              window.onclick = function(event) {
                  if (event.target == modal) {
                       modal.style.display = "none";
                  }
                }
             }else{
                elem.classList.remove('fa-hand-sparkles');
                elem.classList.add('fa-hand-paper');
                elem.setAttribute('title', 'Raise Hand');
                let modal = document.getElementById("handRaiseModal");
                modal.style.display = "none";
             }
    
        });
        //code for implement one to one feature 
       


         
          


        //When user clicks the 'Share screen' button
        document.getElementById( 'share-screen' ).addEventListener( 'click', ( e ) => {
            e.preventDefault();

            if ( screen && screen.getVideoTracks().length && screen.getVideoTracks()[0].readyState != 'ended' ) {
                stopSharingScreen();
            }

            else {
                shareScreen();
            }
        } );


        //When record button is clicked
        document.getElementById( 'record' ).addEventListener( 'click', ( e ) => {
            /**
             * Ask user what they want to record.
             * Get the stream based on selection and start recording
             */
            if ( !mediaRecorder || mediaRecorder.state == 'inactive' ) {
                h.toggleModal( 'recording-options-modal', true );
            }

            else if ( mediaRecorder.state == 'paused' ) {
                mediaRecorder.resume();
            }

            else if ( mediaRecorder.state == 'recording' ) {
                mediaRecorder.stop();
            }
        } );


        //When user choose to record screen
        document.getElementById( 'record-screen' ).addEventListener( 'click', () => {
            h.toggleModal( 'recording-options-modal', false );

            if ( screen && screen.getVideoTracks().length ) {
                startRecording( screen );
            }

            else {
                h.shareScreen().then( ( screenStream ) => {
                    startRecording( screenStream );
                } ).catch( () => { } );
            }
        } );
      
        


        //When user choose to record own video
        document.getElementById( 'record-video' ).addEventListener( 'click', () => {
            h.toggleModal( 'recording-options-modal', false );

            if ( myStream && myStream.getTracks().length ) {
                startRecording( myStream );
            }

            else {
                h.getUserFullMedia().then( ( videoStream ) => {
                    startRecording( videoStream );
                } ).catch( () => { } );
            }
        });

        // if user has joined the meet, update time and meetLink
        document.getElementById("UpdateTime").innerText = moment(Date.now()).format( 'Do MMMM, YYYY h:mm a' );
        document.getElementById("meetLink").innerText   = " | " + h.getQString( location.href, 'room' );

        async function updateTime(){
            document.getElementById("UpdateTime").innerText = moment(Date.now()).format( 'Do MMMM, YYYY h:mm a' );
        }

        setInterval(()=>{
            updateTime();
        },1000);

    }

    //one to one chat feature
  
    let selectElem = document.getElementById('private-chat-select');
    let everyoneOption = document.createElement('option');
    everyoneOption.value = room; // Use the room id as the value
    everyoneOption.textContent = 'Everyone';
    selectElem.appendChild(everyoneOption);
    async function populateUserList() {
        let onlineUsers = await getOnlineUsers(); // Wait for the Promise to resolve
        let selectElem = document.getElementById('private-chat-select');
        // Add "Everyone" option at the beginning
        selectElem.innerHTML = '';
    let everyoneOption = document.createElement('option');
    everyoneOption.value = room; // Use the room id as the value
    everyoneOption.textContent = 'Everyone';
    selectElem.appendChild(everyoneOption);
        for (let i = 0; i < onlineUsers.length; i++) {
            let user = onlineUsers[i];
            let optionElem = document.createElement('option');
            optionElem.value = user.socketId;
            optionElem.textContent = user.username;
            selectElem.appendChild(optionElem);
        }
        console.log(selectElem);
    }
    
    document.getElementById('populate-list-button').addEventListener('click', async function() {
        await populateUserList();
    });
// define getOnlineUsers function
async function getOnlineUsers(){              
    //help of /users route
    const response = await fetch('/onlineUsers');
    const users = await response.json();
    console.log(users);
    return users;

}

//one to one chat feature
// Your Google Cloud Platform project API key
 function translatetext(text1 , targetLanguage1){
    return new Promise((resolve, reject) =>{
   const apiKey1 = 'AIzaSyCftHH6LgB6k0EVmVnapcY2X0jZkj74XCg';
   const url1 = `https://translation.googleapis.com/language/translate/v2?key=${apiKey1}`;
 const data1 = {
    q: text1,
    target: targetLanguage1
};
const options1 = {
    method: 'POST',
    body: JSON.stringify(data1),
    headers: {
        'Content-Type': 'application/json'
    }
};
fetch(url1, options1)
    .then(response => response.json())
    .then(data => {
        // The translated text
        const translation = data.data.translations[0].translatedText;
        resolve(translation);
    })
    .catch(error => console.error('Error:', error));
}
)} 
 
//add attandance button for view-attendance page for view-attnedance id 
// Add this event listener somewhere in your JavaScript
document.getElementById('view-attendance').addEventListener('click', () => {
    // Send a request to the server to get the attendance data
    console.log("view attendance");
    console.log(room);
    fetch(`/attendance/${room}`)
    .then(response => response.json())
    .then(data => {
        // Clear the attendance list
        document.getElementById('attendance-list').innerHTML = '';

        // Add each user to the attendance list
        let userNumber = 1;
        for (let username in data) {
            let user = data[username];
            let listItem = document.createElement('li');
            listItem.textContent = `${userNumber}: ${username} - `;

            // Add each join time
            for (let joinTimeKey in user.joinTimes) {
                listItem.textContent += `Joined at: ${new Date(user.joinTimes[joinTimeKey]).toLocaleTimeString()}, `;
            }

            // Add each leave time
            for (let leaveTimeKey in user.leaveTimes) {
                listItem.textContent += `Left at: ${new Date(user.leaveTimes[leaveTimeKey]).toLocaleTimeString()}, `;
            }

            document.getElementById('attendance-list').appendChild(listItem);
            userNumber++;
        }

        // Show the modal
        $('#attendance-modal').modal('show');
    });
});   
document.getElementById('download').addEventListener('click', () => {
    let attendanceList = document.getElementById('attendance-list');
    let pdf = new jsPDF();

    pdf.text('Attendance List:', 10, 10);
    let y = 20;

    // Loop through each item in the attendance list
    for (let i = 0; i < attendanceList.children.length; i++) {
        let listItem = attendanceList.children[i];

        // Add the text of the list item to the PDF
        pdf.text(listItem.textContent, 10, y);

        // Increment the y coordinate for the next line
        y += 10;
    }

    // Save the PDF
    pdf.save('attendance.pdf');
});
//hide attendance when press close button
document.getElementById('attendance-close').addEventListener('click', () => {
    $('#attendance-modal').modal('hide');
});
// Close the modal when the user clicks anywhere outside of it
window.onclick = function(event) {
    if (event.target == document.getElementById('attendance-modal')) {
        $('#attendance-modal').modal('hide');
    }
}

    
} );

