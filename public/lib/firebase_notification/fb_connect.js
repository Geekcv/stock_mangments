
const serviceAccount = require('./config.js');
const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),

});



function cleanupTokens(response, tokens) {
    // For each notification we check if there was an error.
    const tokensDelete = [];
    response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
            console.error("Failure sending notification to", tokens[index], error);
            if (
                error.code === "messaging/invalid-registration-token" ||
                error.code === "messaging/registration-token-not-registered"
            ) { }
        }
    });
    return Promise.all(tokensDelete);
}


function sendNotification(token, messageTitle, messageBody) {
    console.log("sendNotification");
    console.log("sendNotification---------------->",messageTitle,messageBody);

    const message = {
        notification: {
            title: messageTitle,
            body: messageBody
        },
        token: token,
    };


    return new Promise((resolve, reject) => {
        (async () => {
            try {
                let result = await admin.messaging().send(message);
                // var resToken = await cleanupTokens(result, token);
                console.log("Notification Send");
                console.log("result-------------");
                console.log(result);
                resolve(result);
            } catch (err) {
                resolve(err);
            }
        })();
    })
}


module.exports = { sendNotification };