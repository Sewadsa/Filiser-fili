var SENDGRID = {};
var self = this;

var sgMail = require('@sendgrid/mail');
sgMail.setApiKey(SENDGRID_API_KEY);


SENDGRID.sendEmail = function(data, cb)
{
	sgMail.send(data, (err, result) => {
		if(err){ console.log(err); cb(true); return; }
		
		cb();
	});

}




module.exports = SENDGRID;