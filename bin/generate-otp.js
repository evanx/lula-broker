const otpSecret = process.argv[2]
console.log(require('otplib').authenticator.generate(otpSecret))
