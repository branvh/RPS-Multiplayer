$(document).ready(function() {

    //reset the page
    init();

    //player name submit button even listener
    $('#name-submit').on('click', function() {

        //capture player name and see if game can start
        gameDB.registerPlayer();

        //star game
        game.startGame();

        //stop default - e.g. page refresh
        return false;
    });


    //handle RPS selection clicks
    $('.list-group-item').on('click', function() {

        $('#selection-menu').hide();

        //capture the choice
        let userChoice = $(this).attr('data-pointVal');

        //pass 'this' to db update function
        gameDB.updateDB(userChoice, userID);

    });

    //handle user saying that they'd like to play again
    $('#play-again').on('click', function() {

        //hid the modal box
        $('#play-again-box').hide();

        //reset player's DB fiedlds
        gameDB.createInitialRecord();

        //???configure init / start DB for 1 player registered scenario?
        init();

    });


    //handle a user quitting after game ends
    $('#quit').on('click', function() {

        $('#play-again-box').hide();

        $('#selection-menu').show();

        $('#chat-log').empty();

        chat.loaded = false;

        //remove field from DB, wait for another user to join
        gameDB.database.ref('players/' + userID).remove().then(function() {
            console.log('removed user: ' + userID);
        }).catch(function(err) {
            console.log('atmpted to remove user ' + userID + 'failed .. ' + err);
        });

    });

    //send chat messages
    $('#chat-submit').on('click', function() {


        let message = $('#chat-entry').val().trim();
        $('#chat-entry').val('');
        chat.submit(message);

    });


});

function init() {

    //make invisibile - button menu
    $('#selection-menu').hide();

    //remove gameplay messages
    $('#opponent-message').empty();
    $('#user-message').empty();
    $('#user-wincount').empty();
    $('#opponent-wincount').empty();
    $('#chat-log').empty();
    chat.numChildren = 0;

    //empty game log
    $('tbody').empty();

    //establish DB
    if (!userID) {
        gameDB.startDB(gameDB.config);
    }

    if (userID && !!game.opponent) {
        game.opponent = (userID === 1 ? 2 : 1);
    }

    if (!chat.loaded) {
        chat.loadChat();
    }

    //status message
    $('#status-message').html('Waiting for another user to begin');

}

//variable to store user ID - watch item - potentially store locally or via fireDB
let userID = '';

//database object
let gameDB = {

    database: '',
    playerLocation: '',
    MAX_USERS: 2,
    config: {
        apiKey: "AIzaSyAT-vGnfejr95Di5QWgWIQhJw6raIQf5xs",
        authDomain: "myfirstfirebase-13880.firebaseapp.com",
        databaseURL: "https://myfirstfirebase-13880.firebaseio.com",
        storageBucket: "myfirstfirebase-13880.appspot.com",
        messagingSenderId: "998100629985"
    },
    startDB(config) {
        //initialiaze DB
        firebase.initializeApp(config);

        //set database variable via an IIFE
        gameDB.database = (() => {
            return firebase.database()
        })();

        gameDB.playerLocation = gameDB.database.ref('players');

    },
    registerPlayer() {

        //capture player's name
        let name = $('#name-input').val().trim();

        //exit this function if name is blank or user already exists
        if (!name || userID) return;

        //remove name text immediately from screen
        $('#name-input').val('');
        $('#input-name-container').toggle();

        //check if players folder and player 1 / 2 folders exist
        let userCount = 1;

        let ref = gameDB.database.ref('players');
        ref.once("value")
            .then(function(snapshot) {

                if (snapshot.child('1').exists()) {
                    userCount++;
                }
                if (snapshot.child('2').exists()) {
                    userCount++;
                }

                //set player to p1 or p2, provided that both don't already exists
                // addUser variable must be TRUE in order to push a new user (2 max)
                if (userCount <= gameDB.MAX_USERS) {

                    //set userID to corresponding player #
                    userID = userCount;

                    //set opponent variable
                    game.opponent = (userID === 1 ? 2 : 1);

                    //setup blank player fields in the db
                    gameDB.createInitialRecord();

                } else {
                    $('#status-message').html('');
                }

            });

    },
    createInitialRecord() {

        let target = gameDB.database.ref('players/' + userID);

        target.set({

            name: name,
            wins: 0,
            losses: 0,
            choice: '',
            status: 'ready',
            opponent: game.opponent,
            dateAdded: firebase.database.ServerValue.TIMESTAMP

        })

    },
    updateDB(choice, user) {
        //push user choice to the DB 
        gameDB.database.ref('players/' + user).update({

            choice: choice,
            status: 'playing'

        })

    }

}


//game object
let game = {

    ableToClick: false,
    turn: 1,
    opponent: 0,
    choices: ['Rock', 'Paper', 'Scissors'],
    outcomes: ['Tie', 'Win', 'Loss'],
    startGame() {

        let playerDataLoc = gameDB.database.ref('players');

        playerDataLoc.on('value', function(snapshot) {

                //only move forward if both children exist
                if (!snapshot.child('1').exists() || !snapshot.child('2').exists()) {
                    return;
                }

                //clear waiting message
                if (snapshot.val()[userID].status === 'ready' && snapshot.val()[game.opponent].status === 'ready') {
                    $('#status-message').html('');
                }

                //show the seleciton menu - since we now know that both players exit
                $('#selection-menu').show();

                //display message if waiting for opponent to pick
                if (snapshot.val()[userID].status === 'playing' && snapshot.val()[game.opponent].status === 'ready') {

                    $('#status-message').html('Waiting for opponent to select...');

                }

                //tell user if game is waiting for them in order to proceed
                if (snapshot.val()[userID].status === 'ready' && snapshot.val()[game.opponent].status === 'playing') {

                    $('#status-message').html('Waiting for YOUR choice...');

                }

                //if there are 2 players and they are ready, let them click / play
                if (snapshot.val()[userID].status === 'playing' && snapshot.val()[game.opponent].status === 'playing') {

                    //update DOM status message for beginning turn
                    $('#status-message').html('Beginning turn: ' + game.turn);

                    setTimeout(function() {
                        let userData = snapshot.val()[userID];
                        let opponentData = snapshot.val()[game.opponent];

                        //update UI with players' choices
                        if (userData.choice) {
                            $('#user-message').html('Choice: ' + game.choices[userData.choice]);

                        }
                        //update UI with players' choices
                        if (opponentData.choice) {
                            $('#opponent-message').html('Opponent chose: ' + game.choices[opponentData.choice]);

                        }

                        //evaluate choices if both have been submitted
                        if (userData.choice && opponentData.choice) {

                            //evaluate choices
                            let choiceDiff = userData.choice - opponentData.choice;
                            console.log('diff');
                            let outcome = game.evaluate(choiceDiff);
                            console.log('outcome was ' + outcome);

                            //update the gameplay table

                            let newRow = $('<tr>');
                            newRow.addClass('info');

                            let turnTD = $('<td>');
                            turnTD.html(game.turn);

                            let userChoice = $('<td>');
                            userChoice.html(game.choices[userData.choice]);

                            let opponentChoice = $('<td>');
                            opponentChoice.html(game.choices[opponentData.choice]);

                            let outcomeTD = $('<td>');
                            outcomeTD.html(game.outcomes[outcome]);

                            newRow.append(turnTD);
                            newRow.append(userChoice);
                            newRow.append(opponentChoice);
                            newRow.append(outcomeTD);

                            $('tbody').append(newRow);

                            //mechanism to update win / loss count in DB
                            let userWins = userData.wins;
                            let userLoss = userData.losses;
                            let winner = 0;
                            let gameOver = false;
                            let message = '';

                            if (outcome === 1) {
                                userWins++;
                                message = 'You Win!';
                            } else if (outcome === 2) {
                                userLoss++;
                                message = 'Opponent Wins';
                            } else {
                                message = 'Tie';
                            }

                            //increment turn count
                            game.turn++;

                            //check for winner
                            if (userWins >= 3) {
                                message = 'You win the game!';
                                gameOver = true;
                            } else if (userLoss >= 3) {
                                message = 'You lost...try again';
                                gameOver = true;
                            }

                            if (message) {
                                //DOM status message will update based on turn outcome, win, or loss
                                $('#status-message').html(message);
                            }

                            if (gameOver) {

                                setTimeout(function() {

                                    //move to game over module after user able to realize outcome
                                    game.gameOver();

                                }, 5000);

                            }

                            //If nobody has won, update the DB and continue

                            //wait to update DB in order to display messages
                            setTimeout(function() {
                                gameDB.database.ref('players/' + userID).update({

                                    wins: userWins,
                                    losses: userLoss,
                                    status: 'ready',
                                    choice: ''

                                })
                            }, 2000);
                        }
                    }, 1000); //end set timeouts
                    //clear out messages
                    $('#status-message').html('');
                }


            },
            function(err) {


                console.log('Database connectivity issue ', err);

            })


    },
    evaluate(diff) {

        //tie
        if (diff === 0) return 0;
        //wins
        else if (diff === -1 || diff === -2) return 1;
        //losses
        else return 2;


    },
    gameOver() {

        //clear out the DB
        $('#play-again-box').show();

    }


}

let chat = {

    loaded: false, //used to prevent multiple chat event listeners
    submit(msg) {

        let chatFolder = gameDB.database.ref('chat');

        let newMessage = chatFolder.push();

        newMessage.set({

            user: userID,
            message: msg,
            time: firebase.database.ServerValue.TIMESTAMP

        })
    },
    loadChat() {

        //prevent subsequent listeners from being added
        chat.loaded = true;

        let chatFolder = gameDB.database.ref('chat');

        //when child is added, update DOM with the message content
        chatFolder.on('child_added', function(childsnapshot) {

            let messageSender = ((childsnapshot.val().user === userID) ? 'You: ' : 'Opponent: ');
            let message = childsnapshot.val().message;

            let msg = $('<p>');
            msg.html('<strong>' + messageSender + '</strong>' + message);
            msg.addClass('chat-log');

            $('#chat-panel').append(msg);

            //ensure scroll stays at botom
            $("#chat-panel").animate({ scrollTop: $("#chat-panel")[0].scrollHeight }, 1);



        }, function(err) {

            console.log('error loading chat data: ' + err);

        });


    }

}


//11-15: disconect handler
