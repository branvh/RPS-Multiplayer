$(document).ready(function() {

    //reset the page
    init();

    //player name submit button even listener
    $('#name-submit').on('click', function() {

        //capture player name and see if game can start
        gameDB.registerPlayer();

        //stop default - e.g. page refresh
        return false;
    });


});

function init() {

    //remove win count
    $('.win-count').empty();

    //empty game log
    $('tbody').empty();

    //establish DB 
    gameDB.startDB(gameDB.config);

    //status message
    $('#status-message').html('Waiting for another user to begin');

}

//database object
let gameDB = {

    database: '',
    playerLocation: '',
    userID: '',
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
                if (snapshot.child('2').exists()) userCount++;

                console.log('userCount ', userCount);

                //set player to p1 or p2, provided that both don't already exists
                // addUser variable must be TRUE in order to push a new user (2 max)
                if (userCount < gameDB.MAX_USERS) {

                    let target = gameDB.database.ref('players/' + userCount);

                    target.set({

                        name: name,
                        wins: 0,
                        losses: 0,
                        choice: '',
                        dateAdded: firebase.database.ServerValue.TIMESTAMP

                    })

                             }
                else {
                	$('#status-message').html('');
                }


            });

       



    }

}


//game object
let game = {

    player1: '',
    player2: '',
    status: '',

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

*/
