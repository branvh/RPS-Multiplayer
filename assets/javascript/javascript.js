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

    $('.list-group-item').on('click', function() {

        $('#selection-menu').hide();

        //capture the choice
        let userChoice = $(this).attr('data-pointVal');

        //pass 'this' to db update function
        gameDB.updateDB(userChoice, userID);

    });


});

function init() {

    //reset userID
    userID = '';

    //make invisibile - button menu
    $('#selection-menu').hide();

    //remove win count
    $('.win-count').empty();

    //empty game log
    $('tbody').empty();

    //establish DB 
    gameDB.startDB(gameDB.config);

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

        //don't accept blank values
        if (!name) return;

        //remove name text immediately from screen
        $('#name-input').val('');
        $('#input-name-container').toggle();

        //check if players folder and player 1 / 2 folders exist

        let p1exists;
        let p2exists;
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

                } else {
                    $('#status-message').html('');
                }

            });

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
    startGame() {

        let playerDataLoc = gameDB.database.ref('players');

        playerDataLoc.on('value', function(snapshot) {

                //only move forward if both children exist
                if (!snapshot.child('1').exists() || !snapshot.child('2').exists()) {
                    return;
                }

                //clear waiting message
                if (snapshot.child('1').exists() || snapshot.child('2').exists()) {
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

                    //update DOM status
                    $('#status-message').html('Beginning turn: ' + game.turn);

                    let userData = snapshot.val()[userID];
                    let opponentData = snapshot.val()[game.opponent];

                    //update UI with players' choices
                    if (userData.choice) {
                        $('#user-message').html('Choice: ', userData.choice);

                    }

                    if (opponentData.choice) {
                        $('#opponent-message').html('Opponent chose: ', opponentData.choice);

                    }

                    //evaluate choices if both have been submitted
                    if (userData.choice && opponentData.choice) {

                        //evaluate choices
                        let choiceDiff = userData.choice - opponentData.choice;
                        let outcome = game.evaluate(choiceDiff);
                        console.log('outcome was ' + outcome);

                        //mechanism to update win / loss count in DB
                        let userWins = userData.wins;
                        let userLoss = userData.losses;
                        let winner = 0;
                        let gameOver = false;
                        let message = '';

                        if (outcome === 1) {
                            userWins++;
                            console.log('user wins: ' + userWins);
                            console.log('user losses: ' + userLoss);
                            message = 'You Win!';
                        } else if (outcome === 2) {
                            userLoss++;
                            message = 'Opponent Wins';
                            console.log('user wins: ' + userWins);
                            console.log('user losses: ' + userLoss)
                        } else {
                            message = 'Tie';
                        }

                        //increment turn count
                        game.turn++;

                        //check for winner
                        if (userWins === 3) {
                        	console.log('win check hit');
                            message = 'You win!';
                            gameOver = true;
                        } else if (userLoss === 3) {
                        	console.log('loss check hit');
                            message = 'You lost...try again';
                            gameOver = true;
                        } 

                        if (message) {
                            //DOM status message will update based on turn outcome, win, or loss
                            $('#status-message').html(message);
                        } 

                        if (gameOver) {
                            game.gameOver();
                        }

                        //If nobody has won, update the DB and continue
                        gameDB.database.ref('players/' + userID).update({

                            wins: userWins,
                            losses: userLoss,
                            status: 'ready',
                            choice: ''

                        })
                    }

                }



            },
            function(err) {


                console.log('Database connectivity issue ', err);

            })


    },
    evaluate(diff) {
        //return 1 if p1 wins, 2 if p2 wins, 0 if a tie
        if (diff === 0) return 0;
        else if ((diff) % 3 === 1) return 1;
        else return 2;

    },
    gameOver() {

        //clear out the DB
        

    }


}


/*
	form - input name - create player
	must have 2 players at which point, start

	place to inform player of status - turn, waiting, over/win

	object: players{player 1, player 2} turn...
			turn: p1, p2, outcome
	player: wins, name

	message board: message log

	disconnect triggers no more game

	....

	turn = 0, status = ready

	create an 'on value' listener

		when there is a p1 and p2, start game - set able to click = true

		also, set status = playing

		otherwise, keep able to click = false and status = ready

	player clicks on button

	if able to click === true, send choice to DB

	first, set able to click = false to prevent extra clicks

	on value, check if both players have made a choice

	on value, display opponent's choice

	if both have made a choice, call function to evaluate the choice

	display the outcome in the status <p> tag

	display outcome / choices in the table at bottom

	wait a second, then set able to click = true and update message to 'select..'

	..if player has won

		display a modal to ask if want to play again

		if yes, clear all of players' variables

		set status = ready

		...value listener will cover restarting once p2 accepts


*/
