const nodemailer = require("nodemailer");

class EmailService {
    constructor() {
        // this.transporter = nodemailer.createTransport({
        //     service: "gmail",
        //     auth: {
        //         user: process.env.EMAIL,
        //         pass: process.env.EMAIL_PASSWORD
        //     }
        // })
        this.transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

        //verify email connection
        this.transporter.verify((error) => {
            if (error) {
                console.log(error)
            } else {
               
            }
        })

    }


    async sendEmail(fromName, to, subject, htmlContent, cc = null) {
        const mailOptions = {
            from: `"${fromName}" <${process.env.EMAIL}>`,
            to,
            cc,
            subject,    
            html: htmlContent,
        };

        return new Promise((resolve, reject) => {
            this.transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(info)
                }
            })
        })
    }

    async sendToMultipleRecipients(fromName, recipients, subject, htmlContent, cc = null) {
        let successCount = 0;   
        let failureCount = 0;  
        const results = [];
    
       
        const emailPromises = recipients.map(async (email) => {
            try {
                const info = await this.sendEmail(fromName, email, subject, htmlContent, cc);
                successCount++;
                results.push({ email, status: 'sent', info });
            } catch (error) {
                failureCount++;
                results.push({ email, status: 'failed', error: error.message });
            }
        });
    
        await Promise.all(emailPromises);
    
        return new Promise((resolve) => {
            resolve({
                successCount,
                failureCount,
                totalCount: recipients.length,
                results,  
            });
        });
    }
    



}

module.exports = { EmailService }