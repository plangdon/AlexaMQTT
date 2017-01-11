var https = require('https');
var mqtt = require('mqtt');

var mqtt_url = 'blt-mqtt.cloudapp.net'; //Name of your MQTT Server
var mqtt_port = 1883;
var mqtt_command_topic = 'alexa/mmm/command';
var mqtt_display_topic = 'alexa/mmm/display';

exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.[unique-value-here]") {
             context.fail("Invalid Application ID");
        }
        */

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("ModuleViewIntent" === intentName) {
        issueCommand(intent, session, callback);
    } else if ("TextDisplayIntent" === intentName) {
        displayText(intent, session, callback);
    } else if ("SleepIntent" === intentName) {
        issueSleep(intent, session, callback);
    } else if ("WakeIntent" === intentName) {
        issueWake(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add Cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome to the Magic Mirror";
    var speechOutput = "Welcome to the Magic Mirror. " +
        "I can show and hide modules on the screen by telling me to show or hide them.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "You can get help by asking, help.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getHelpResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Help";
    var speechOutput = "I can show and hide modules on the screen by telling me to show or hide them.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Like, Hide Calendar or Show Current Weather";

    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    var cardTitle = "Session Ended";
    var speechOutput = "Have a nice day!";
    // Setting this to true ends the session and exits the skill.
    var shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}






function issueCommand(intent, session, callback) {
    var repromptText = "You can ask me an another.";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var maxLength = 0;


    if (intent.slots.showhide.value==='?') {
            speechOutput = "Please only say on,off or show,hide or enable,disable";
             callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    } else {
        if (intent.slots.showhide.value=="on"||intent.slots.showhide.value=="show"||intent.slots.showhide.value=="enable"){
            intent.slots.showhide.value = "Show";
        }
        else {
            intent.slots.showhide.value = "Hide";
        }
    }


     if (intent.slots.module.value==='?') {
        speechOutput = "Please say the name of a module, like clock or current weather.";
                 callback(sessionAttributes,
                 buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
     } else {
        intent.slots.module.value = intent.slots.module.value.toLowerCase();
        intent.slots.module.value = intent.slots.module.value.replace(/\s+/g, '');
     }

        var mqttpromise = new Promise(function (resolve,reject) {
    	    var client = mqtt.connect({port:mqtt_port,host:mqtt_url});

    		client.on('connect', function() {
    		    client.publish(mqtt_command_topic, intent.slots.module.value + ':' + intent.slots.showhide.value, function() {
    			console.log("Message is published");
    			client.end();
    			resolve('Done Sending');
    		    });
    		});
        });

	  mqttpromise.then(
	    function(data) {
	      console.log('Function called succesfully:', data);
	      speechOutput = "Ok, I've set " + intent.slots.module.value + " to " + intent.slots.showhide.value;
	      callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
	    }, function(err) {
	      console.log('An error occurred:', err);
	      speechOutput = "I had trouble doing that, please try again.";
	      callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
	    });

}

function displayText(intent, session, callback) {
    var repromptText = "You can ask me an another.";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var maxLength = 0;


    if (intent.slots.freeformtext.value==='?') {
            speechOutput = "You have left me with nothing to say...Really, say anything";
             callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    }


        var mqttpromise = new Promise(function (resolve,reject) {
    	    var client = mqtt.connect({port:mqtt_port,host:mqtt_url});

    		client.on('connect', function() {
    		    client.publish(mqtt_display_topic, intent.slots.freeformtext.value, function() {
    			console.log("Message is published");
    			client.end();
    			resolve('Done Sending');
    		    });
    		});
        });

	  mqttpromise.then(
	    function(data) {
	      console.log('Function called succesfully:', data);
	      speechOutput = "Ok, I've asked your mirror to show " + intent.slots.freeformtext.value;
	      callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
	    }, function(err) {
	      console.log('An error occurred:', err);
	      speechOutput = "I had trouble doing that, please try again.";
	      callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
	    });

}


function issueSleep(intent, session, callback) {
    var repromptText = "You can ask me an another.";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var maxLength = 0;



        var mqttpromise = new Promise(function (resolve,reject) {
    	    var client = mqtt.connect({port:mqtt_port,host:mqtt_url});

    		client.on('connect', function() {
    		    client.publish(mqtt_command_topic, 'all:Hide', function() {
    			console.log("Message is published");
    			client.end();
    			resolve('Done Sending');
    		    });
    		});
        });

	  mqttpromise.then(
	    function(data) {
	      console.log('Function called succesfully:', data);
	      speechOutput = "Good bye for now";
	      callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
	    }, function(err) {
	      console.log('An error occurred:', err);
	      speechOutput = "I had trouble doing that, please try again.";
	      callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
	    });

}


function issueWake(intent, session, callback) {
    var repromptText = "You can ask me an another.";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var maxLength = 0;



        var mqttpromise = new Promise(function (resolve,reject) {
    	    var client = mqtt.connect({port:mqtt_port,host:mqtt_url});

    		client.on('connect', function() {
    		    client.publish(mqtt_command_topic, 'all:Show', function() {
    			console.log("Message is published");
    			client.end();
    			resolve('Done Sending');
    		    });
    		});
        });

	  mqttpromise.then(
	    function(data) {
	      console.log('Function called succesfully:', data);
	      speechOutput = "Hello there!";
	      callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
	    }, function(err) {
	      console.log('An error occurred:', err);
	      speechOutput = "I had trouble doing that, please try again.";
	      callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
	    });

}



// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },

        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}