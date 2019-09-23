var SENDGRID = {};
var self = this;

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(SENDGRID_API_KEY);


SENDGRID.sendEmail = function()
{

	const msg = {
		to: 'sewadsa@gmail.com',
		from: 'noreply@fili.cc',
		subject: 'Sending with Twilio SendGrid is Fun',
		text: 'and easy to do anywhere, even with Node.js',
		html: '<strong>and easy to do anywhere, even with Node.js</strong>',
	}
	sgMail.send(msg, (err, result) => {
		if(err){ console.log(err); return; }
		
		console.log('EMAIL SENT')
	});

}




module.exports = SENDGRID;