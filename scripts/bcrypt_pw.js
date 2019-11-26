const bcrypt = require('bcrypt');

// Takes in a string from the command line and outputs the bcrypt version of it
// Useful for manually creating users
console.log(bcrypt.hashSync(process.argv[2], 10));