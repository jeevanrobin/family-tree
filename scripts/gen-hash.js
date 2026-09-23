import bcrypt from 'bcryptjs';

const password = 'M5ATestFamily2026!';
const hash = bcrypt.hashSync(password, 10);

console.log('Password hash:', hash);
console.log('Hash length:', hash.length);
